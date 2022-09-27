/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";
const { Config, ConfigOptions } = require("karma");

const path = require("path");
const webpackConfig = require("./test.webpack.config.js");
const tsconfig = require("./test.tsconfig.json");

const recursivePathToTests = "test/**/*.ts";
const srcCssRecursivePath = ".tmp/drop/visual.css";
const srcOriginalRecursivePath = "src/**/*.ts";
const testRecursivePath = "test/visualTest.ts";
const coverageFolder = "coverage";

process.env.CHROME_BIN = require("playwright").chromium.executablePath();

module.exports = (config) => {
    config.set({
        browsers: ["ChromeHeadless"],
        browserNoActivityTimeout: 100000,
        colors: true,
        frameworks: ["webpack", "jasmine"],
        reporters: [
            "progress",
            "coverage",
        ],
        singleRun: true,
        files: [
            srcCssRecursivePath,
            testRecursivePath,
            {
                pattern: "./capabilities.json",
                watched: false,
                served: true,
                included: false
            },
            {
                pattern: srcOriginalRecursivePath,
                included: false,
                served: true
            }
        ],
        preprocessors: {
            [testRecursivePath]: ["webpack"]
        },
        typescriptPreprocessor: {
            options: tsconfig.compilerOptions,
        },
        coverageReporter: {
            dir: coverageFolder,
            reporters: [
                { type: "html" },
                { type: "lcov" }
            ]
        },
        remapIstanbulReporter: {
            reports: {
                lcovonly: coverageFolder + "/lcov.info",
                html: coverageFolder,
                "text-summary": null
            }
        },
        mime: {
            "text/x-typescript": ["ts", "tsx"]
        },
        webpack: webpackConfig,
        webpackMiddleware: {
            stats: "errors-only"
        }
    });
};