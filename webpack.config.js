
var path = require("path");

module.exports = {
    entry: "./src/index.js",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist/")
    },
    externals: {
        Quill: "quill"
    },
    devtool: "#eval-source-map"
}
