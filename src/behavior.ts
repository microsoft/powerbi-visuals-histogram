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
    // d3
    import Selection = d3.Selection;

    // powerbi.visuals
    import IInteractivityService = powerbi.visuals.IInteractivityService;
    import IInteractiveBehavior = powerbi.visuals.IInteractiveBehavior;
    import SelectableDataPoint = powerbi.visuals.SelectableDataPoint;
    import ISelectionHandler = powerbi.visuals.ISelectionHandler;
    import ISelectionId = powerbi.visuals.ISelectionId;

    export interface HistogramBehaviorOptions {
        columns: Selection<HistogramDataPoint>;
        clearCatcher: Selection<any>;
        interactivityService: IInteractivityService;
    }

    export class HistogramBehavior implements IInteractiveBehavior {
        private columns: Selection<HistogramDataPoint>;
        private selectedDataPoints: SelectableDataPoint[];
        private clearCatcher: Selection<any>;
        private interactivityService: IInteractivityService;

        public static create(): IInteractiveBehavior {
            return new HistogramBehavior();
        }

        public bindEvents(
            behaviorOptions: HistogramBehaviorOptions,
            selectionHandler: ISelectionHandler): void {

            this.columns = behaviorOptions.columns;
            this.interactivityService = behaviorOptions.interactivityService;
            this.clearCatcher = behaviorOptions.clearCatcher;

            this.columns.on("click", (dataPoint: HistogramDataPoint) => {
                selectionHandler.handleClearSelection();

                const areDataPointsSelected: boolean = HistogramBehavior.areDataPointsSelected(
                    this.selectedDataPoints,
                    dataPoint.subDataPoints);

                if (!areDataPointsSelected) {
                    dataPoint.subDataPoints.forEach((subDataPoint: SelectableDataPoint) => {
                        selectionHandler.handleSelection(subDataPoint, true);
                    });

                    this.selectedDataPoints = dataPoint.subDataPoints;
                } else {
                    this.createAnEmptySelectedDataPoints();
                }
            });

            this.clearCatcher.on("click", () => {
                selectionHandler.handleClearSelection();
                this.createAnEmptySelectedDataPoints();
            });
        }

        public renderSelection(hasSelection: boolean): void {
            histogramUtils.updateFillOpacity(
                this.columns,
                this.interactivityService,
                hasSelection);
        }

        public static areDataPointsSelected(
            selectedDataPoints: SelectableDataPoint[],
            dataPoints: SelectableDataPoint[]): boolean {
            if (!dataPoints
                || !selectedDataPoints
                || dataPoints.length !== selectedDataPoints.length) {

                return false;
            }

            return selectedDataPoints.every((firstDataPoint: SelectableDataPoint) => {
                return dataPoints.some((secondDataPoint: SelectableDataPoint) => {
                    return HistogramBehavior.areSelectionIdsTheSame(firstDataPoint, secondDataPoint);
                });
            });
        }

        private static areSelectionIdsTheSame(
            firstDataPoint: SelectableDataPoint,
            secondDataPoint: SelectableDataPoint): boolean {

            return firstDataPoint
                && secondDataPoint
                && firstDataPoint.identity
                && secondDataPoint.identity
                && (firstDataPoint.identity as ISelectionId).equals(secondDataPoint.identity as ISelectionId);
        }

        private createAnEmptySelectedDataPoints(): void {
            this.selectedDataPoints = [];
        }
    }
}
