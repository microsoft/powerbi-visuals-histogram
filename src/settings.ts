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

module powerbi.extensibility.visual {
    import SettingsParser = powerbi.extensibility.visual.settingsParser.SettingsParser;

    export class HistogramSettings extends SettingsParser {
        public general: HistogramGeneralSettings = new HistogramGeneralSettings();
        public dataPoint: HistogramDataPointSettings = new HistogramDataPointSettings();
        public xAxis: HistogramXAxisSettings = new HistogramXAxisSettings();
        public yAxis: HistogramYAxisSettings = new HistogramYAxisSettings();
        public labels: HistogramLabelSettings = new HistogramLabelSettings();
    }

    export class HistogramGeneralSettings {
        public displayName: string = "Histogram";
        public bins: number = null;
        public frequency: boolean = true;
    }

    export class HistogramDataPointSettings {
        public fill: string = "#01b8aa";
    }

    export enum HistogramAxisStyle {
        showTitleOnly = "showTitleOnly" as any,
        showUnitOnly = "showUnitOnly" as any,
        showBoth = "showBoth" as any
    }

    export class HistogramAxisSettings {
        public show: boolean = true;
        public axisColor: string = "#777";
        public title: boolean = true;
        public displayUnits: number = 0;
        public precision: number = 2;
        public style: HistogramAxisStyle = HistogramAxisStyle.showTitleOnly;
    }

    export class HistogramXAxisSettings extends HistogramAxisSettings { }

    export class HistogramYAxisSettings extends HistogramAxisSettings {
        public start: number = 0;
        public end: number = null;
        public position: HistogramPositionType = HistogramPositionType.Left;
    }

    export enum HistogramPositionType {
        Left = "Left" as any,
        Right = "Right" as any
    }

    export class HistogramLabelSettings {
        public show: boolean = false;
        public color: string = "#777777";
        public displayUnits: number = 0;
        public precision: number = 2;
        public fontSize: number = 9;
    }
}
