const {merge, mergeWithRules} = require("webpack-merge");
const common = require("./webpack.common.js");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const path = require("path");


module.exports = mergeWithRules({
    module: {
        rules: {
            test: "match",
            use: "replace",
        },
    },
})(common, {
    mode: "development",
    devtool: "eval-source-map",
    devServer: {
        hot: true,
        port: 3010,
        static: "./dist",
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                include: path.resolve(__dirname, "src"),
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "@babel/preset-env",
                            "@babel/preset-react",
                        ],
                        plugins: [
                            require.resolve("react-refresh/babel"),
                        ],
                    },
                },
            },
        ],
    },
    plugins: [
        new ReactRefreshWebpackPlugin(),
    ],
});
