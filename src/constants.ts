import { IMargin } from "powerbi-visuals-utils-svgutils";
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";
import { textMeasurementService } from "powerbi-visuals-utils-formattingutils";

export interface Brackets {
    left: string;
    right: string;
}

export const ExcludeBrackets: Brackets = {
    left: "(",
    right: ")"
};

export const IncludeBrackets: Brackets = {
    left: "[",
    right: "]"
};

export const TextProperties: textMeasurementService.TextProperties = {
    fontFamily: "helvetica, arial, sans-serif",
    fontSize: PixelConverter.toString(11) // Note: This value and font-size in histogram.less should be the same.
};

// Data
export const SumFrequency: number = 0;
export const Frequency: number = 1;
export const Value: number = 0;

export const MinFrequencyNumber: number = 1;
export const MinLabelNumber: number = 0;

export const MinPrecision: number = 0;
export const MaxPrecision: number = 17; // max number of decimals in float

export const MinXAxisStartValue: number = -(1e+25);
export const MaxXAxisEndValue: number = 1e+25;

export const YTitleMargin: number = 70;
export const YAxisMargin: number = 15;
export const MinYTitleMargin: number = 0;

export const MinViewportSize: number = 100;
export const MinViewportInSize: number = 0;

export const MinAmountOfValues: number = 1;
export const MinAmountOfDataPoints: number = 0;

export const MiddleFactor: number = 2;

// View
export const AdditionalWidthOfLabel: number = 3;
export const AdditionalHeightOfLabel: number = 3;

export const LegendSizeWhenTitleIsActive: number = 50;
export const LegendSizeWhenTitleIsNotActive: number = 25;

export const InnerPaddingRatio: number = 1;

export const DataLabelXOffset: number = 2;
export const DataLabelYOffset: number = 1.8;

export const ColumnPadding: number = 2.5;
export const ColumnAndLabelOffset: number = 1.5;

export const MinColumnHeight: number = 1;

export const SeparatorNumbers: string = ", ";

export const MaxWidthOfTheLatestLabel: number = 40;

// SVG
export const SvgPosition: number = 0;
export const SvgLegendPosition: number = 0;
export const SvgAngle: number = 270;
export const SvgOuterPadding: number = 0;

export const SvgXAxisDx: string = "-0.5em";
export const SvgXAxisDy: string = "-1em";
export const SvgYAxisDx: string = "3em";

export const SvgMargin: IMargin = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
};
