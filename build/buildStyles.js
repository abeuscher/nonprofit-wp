const sass = require("sass");
const fs = require("fs");

const buildStyles = (siteSettings) => {
  console.log("Writing css file");

  // First, read the theme header from the SCSS file
  const sourceScss = fs.readFileSync(siteSettings.stylesheets[0].srcDir + "style.scss", "utf-8");

  // Extract WordPress theme header comment (everything between /* and */ at the beginning of the file)
  const headerMatch = sourceScss.match(/\/\*[\s\S]*?\*\//);
  const themeHeader = headerMatch ? headerMatch[0] + "\n" : "";

  // Compile SCSS
  const fileData = sass.compile(siteSettings.stylesheets[0].srcDir + "style.scss", {
    style: "compressed",
    quietDeps: true,
  });

  // Combine the theme header with the compiled CSS
  const finalCss = themeHeader + fileData.css;

  // Write to file
  fs.writeFile(siteSettings.stylesheets[0].buildDir + "style.css", finalCss, (err) => {
    if (err) {
      console.error(err);
    }
  });
};

module.exports = buildStyles;
