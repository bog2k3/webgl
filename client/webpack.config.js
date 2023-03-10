const path = require("path");

module.exports = {
	entry: "./build/main.js",
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "../www/dist"),
	},
	resolve: {
		fallback: {
			fs: false,
			path: false, // ammo.js seems to also use path
		},
	},
	devtool: "inline-source-map",
	mode: "development",
};
