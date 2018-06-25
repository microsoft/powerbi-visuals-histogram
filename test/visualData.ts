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

/// <reference path="_references.ts"/>

module powerbi.extensibility.visual.test {
    // powerbi.extensibility.utils.test
    import getRandomNumbers = powerbi.extensibility.utils.test.helpers.getRandomNumbers;
    import TestDataViewBuilder = powerbi.extensibility.utils.test.dataViewBuilder.TestDataViewBuilder;

    // powerbi.extensibility.utils.type
    import ValueType = powerbi.extensibility.utils.type.ValueType;

    export class HistogramData extends TestDataViewBuilder {
        public static ColumnCategory: string = "Age";
        public static ColumnValues: string = "Value";

        public categoryColumnValues: number[] = getRandomNumbers(20, 10, 60).sort();
        public valuesColumnValues: number[] = getRandomNumbers(this.categoryColumnValues.length, 1, 10);

        public getDataView(
            columnNames?: string[],
            numberOfRecords: number = Number.MAX_VALUE,
        ): DataView {
            const categoryColumnValues: number[] = this.categoryColumnValues.slice(0, numberOfRecords);
            const valuesColumnValues: number[] = this.valuesColumnValues.slice(0, numberOfRecords);

            return this.createCategoricalDataViewBuilder([
                {
                    source: {
                        displayName: HistogramData.ColumnCategory,
                        isMeasure: true,
                        type: ValueType.fromDescriptor({ numeric: true }),
                    },
                    values: categoryColumnValues
                }
            ], [
                    {
                        source: {
                            displayName: HistogramData.ColumnValues,
                            isMeasure: true,
                            type: ValueType.fromDescriptor({ numeric: true }),
                        },
                        values: valuesColumnValues
                    }
                ], columnNames).build();
        }
    }
}
