const chokidar = require("chokidar");
const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

// Parse command line arguments for silent mode
const args = process.argv.slice(2);
const isSilent = args.includes("--silent") || args.includes("-s");

// Add silent mode to site settings for passing to build modules
const siteSettings = require("./settings.js")();
siteSettings.isSilent = isSilent;

const buildScripts = require("./build/buildScripts.js");
const buildStyles = require("./build/buildStyles.js");

// Custom logging function that respects silent mode
const log = (message) => {
  if (!isSilent) {
    console.log(message);
  }
};

const clearDir = (directory, cb) => {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
    log("Directory cleared: " + directory);
  }
  fs.mkdir(path.join(directory), { recursive: true }, (err) => {
    if (err) {
      return console.error("Error creating directory:", err);
    }
    log("Directory created: " + directory);
    if (cb) {
      cb();
    }
  });
};

// Helper to wait for file to exist and have content
const waitForFile = (filePath, maxWaitMs = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkFile = () => {
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
        resolve(true);
      } else if (Date.now() - startTime > maxWaitMs) {
        reject(new Error(`Timeout waiting for file: ${filePath}`));
      } else {
        setTimeout(checkFile, 100); // Check every 100ms
      }
    };
    checkFile();
  });
};

const buildSite = async () => {
  try {
    // Ensure all build directories exist
    siteSettings.directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Build scripts
    await buildScripts(siteSettings);
    log("Scripts built successfully.");

    // Build styles
    await buildStyles(siteSettings);
    log("Styles built successfully.");

    // Copy assets
    siteSettings.assets.forEach((asset) => {
      const srcPath = path.resolve(asset.srcDir);
      if (fs.existsSync(srcPath)) {
        fse.copySync(srcPath, asset.buildDir, { overwrite: true });
        log(`Assets copied from ${srcPath} to ${asset.buildDir}`);
      } else {
        console.warn(`Asset source directory not found: ${srcPath}`);
      }
    });

    if (siteSettings.siteThumb) {
      const thumbSrc = path.join(siteSettings.srcDir, siteSettings.siteThumb);
      const thumbDest = path.join(siteSettings.assets[0].buildDir, siteSettings.siteThumb);
      if (fs.existsSync(thumbSrc)) {
        fse.copyFileSync(thumbSrc, thumbDest);
        log(`Site thumbnail copied to ${thumbDest}`);
      } else {
        console.warn(`Site thumbnail not found: ${thumbSrc}`);
      }
    }

    // Add a verification step with proper waiting for files
    if (isSilent) {
      // Key files to verify
      const jsFilePath = path.join(
        siteSettings.jsFiles[0].buildDir,
        siteSettings.jsFiles[0].buildFileName,
      );

      // Wait for files to be ready (with timeout)
      try {
        log("Verifying build files...");
        await waitForFile(jsFilePath);
        log("JS file verified successfully.");
      } catch (err) {
        throw new Error(`Build verification failed: ${err.message}`);
      }
    }

    log("Build process completed successfully.");

    // If in silent mode, exit after build completes
    if (isSilent) {
      // Small delay to ensure any pending writes are completed
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  } catch (err) {
    console.error("Error during build process:", err);
    // Exit with error code in case of failure
    if (isSilent) {
      process.exit(1);
    }
  }
};

// Start build process with async handling
const startBuild = async () => {
  try {
    // Create the build directories
    await new Promise((resolve) => {
      // Make sure build directories exist
      siteSettings.directories.forEach((dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
      resolve();
    });

    await buildSite();
  } catch (err) {
    console.error("Build failed:", err);
    if (isSilent) {
      process.exit(1);
    }
  }
};

// Run the build
startBuild();

// Only set up file watchers in development mode
if (!isSilent) {
  const scriptWatcher = chokidar.watch(siteSettings.jsFiles[0].srcDir);
  scriptWatcher.on("change", () => {
    log("Script change detected.");
    buildScripts(siteSettings);
  });

  const stylesheetWatcher = chokidar.watch(siteSettings.stylesheets[0].srcDir);
  stylesheetWatcher.on("change", () => {
    log("Stylesheet change detected.");
    buildStyles(siteSettings);
  });
}
