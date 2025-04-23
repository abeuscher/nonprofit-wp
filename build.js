const chokidar = require("chokidar");
const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

const siteSettings = require("./settings.js")();

const buildTemplates = require("./build/buildTemplates.js");
const buildScripts = require("./build/buildScripts.js");
const buildStyles = require("./build/buildStyles.js");

const clearDir = (directory, cb) => {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
    console.log("Directory cleared:", directory);
  }
  fs.mkdir(path.join(directory), { recursive: true }, (err) => {
    if (err) {
      return console.error("Error creating directory:", err);
    }
    console.log("Directory created:", directory);
    if (cb) {
      cb();
    }
  });
};

const buildSite = () => {
  try {
    // Ensure all build directories exist
    siteSettings.directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Build templates first to ensure they are available for scripts and styles
    buildTemplates(siteSettings);
    console.log("Templates built successfully.");

    // Build scripts next
    buildScripts(siteSettings);
    console.log("Scripts built successfully.");

    // Finally, build styles
    buildStyles(siteSettings);
    console.log("Styles built successfully.");

    // Copy assets
    siteSettings.assets.forEach((asset) => {
      const srcPath = path.resolve(asset.srcDir);
      if (fs.existsSync(srcPath)) {
        fse.copySync(srcPath, asset.buildDir, { overwrite: true });
        console.log(`Assets copied from ${srcPath} to ${asset.buildDir}`);
      } else {
        console.warn(`Asset source directory not found: ${srcPath}`);
      }
    });

    if (siteSettings.siteThumb) {
      const thumbSrc = path.join(siteSettings.srcDir, siteSettings.siteThumb);
      const thumbDest = path.join(siteSettings.assets[0].buildDir, siteSettings.siteThumb);
      if (fs.existsSync(thumbSrc)) {
        fse.copyFileSync(thumbSrc, thumbDest);
        console.log(`Site thumbnail copied to ${thumbDest}`);
      } else {
        console.warn(`Site thumbnail not found: ${thumbSrc}`);
      }
    }

    console.log("Build process completed successfully.");
  } catch (err) {
    console.error("Error during build process:", err);
  }
};

// Clear template directory and start build process
clearDir(siteSettings.templates[0].buildDir, buildSite);

// Set up file watchers for continuous development
const templateWatcher = chokidar.watch(siteSettings.templates[0].srcDir);
templateWatcher.on("change", () => {
  console.log("Template change detected.");
  buildTemplates(siteSettings);
});

const scriptWatcher = chokidar.watch(siteSettings.jsFiles[0].srcDir);
scriptWatcher.on("change", () => {
  console.log("Script change detected.");
  buildScripts(siteSettings);
});

const stylesheetWatcher = chokidar.watch(siteSettings.stylesheets[0].srcDir);
stylesheetWatcher.on("change", () => {
  console.log("Stylesheet change detected.");
  buildStyles(siteSettings);
});
