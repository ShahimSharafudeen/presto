/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from "react";
import DataTable, {createTheme} from 'react-data-table-component';

import {
    addToHistory,
    computeRate,
    formatCount,
    formatDataSize,
    formatDataSizeBytes,
    formatDuration,
    formatShortDateTime,
    getFirstParameter,
    getHostAndPort,
    getHostname,
    getPort,
    getStageNumber,
    getStageStateColor,
    getTaskIdSuffix,
    getTaskNumber,
    GLYPHICON_HIGHLIGHT,
    parseDataSize,
    parseDuration,
    precisionRound
} from "../utils";
import {QueryHeader} from "./QueryHeader";

createTheme('dark', {
    background: {
        default: 'transparent',
    },
});

function TaskList({tasks}) {
    function removeQueryId(id) {
        const pos = id.indexOf('.');
        if (pos !== -1) {
            return id.substring(pos + 1);
        }
        return id;
    }

    function compareTaskId(taskA, taskB) {
        const taskIdArrA = removeQueryId(taskA.taskId).split(".");
        const taskIdArrB = removeQueryId(taskB.taskId).split(".");

        if (taskIdArrA.length > taskIdArrB.length) {
            return 1;
        }
        for (let i = 0; i < taskIdArrA.length; i++) {
            const anum = Number.parseInt(taskIdArrA[i]);
            const bnum = Number.parseInt(taskIdArrB[i]);
            if (anum !== bnum) {
                return anum > bnum ? 1 : -1;
            }
        }

        return 0;
    }

    function showPortNumbers(items) {
        // check if any host has multiple port numbers
        const hostToPortNumber = {};
        for (let i = 0; i < items.length; i++) {
            const taskUri = items[i].taskStatus.self;
            const hostname = getHostname(taskUri);
            const port = getPort(taskUri);
            if ((hostname in hostToPortNumber) && (hostToPortNumber[hostname] !== port)) {
                return true;
            }
            hostToPortNumber[hostname] = port;
        }

        return false;
    }

    function formatState(state, fullyBlocked) {
        if (fullyBlocked && state === "RUNNING") {
            return "BLOCKED";
        }
        else {
            return state;
        }
    }


    if (tasks === undefined || tasks.length === 0) {
        return (
            <div className="row error-message">
                <div className="col-12"><h4>No threads in the selected group</h4></div>
            </div>);
    }

    const showingPortNumbers = showPortNumbers(tasks);

    function calculateElapsedTime(row) {
        let elapsedTime = parseDuration(row.stats.elapsedTimeInNanos + "ns");
        if (elapsedTime === 0) {
            elapsedTime = Date.now() - Date.parse(row.stats.createTime);
        }
        return elapsedTime;
    }

    const customStyles = {
        headCells: {
            style: {
                padding: '2px', // override the cell padding for head cells
                fontSize: '15px',
                overflowX: 'auto', // Enables horizontal scrolling
            },
        },
        cells: {
            style: {
                padding: '2px', // override the cell padding for data cells
                fontSize: '15px',
                overflowX: 'auto', // Enables horizontal scrolling
            },
        },
    };

    const hasSplitStats = tasks.some(task => task.stats.completedSplits !== undefined);

    const columns = [
        {
            name: 'ID',
            selector: row => row.taskId,
            sortFunction: compareTaskId,
            cell: row => (<a href={"/v1/taskInfo/" + row.taskId + "?pretty"}>
                {getTaskIdSuffix(row.taskId)}
            </a>),
            minWidth: '60px',
        },
        {
            name: 'Host',
            selector: row => getHostname(row.taskStatus.self),
            cell: row => (<a href={"worker.html?" + row.nodeId} className="font-light nowrap" target="_blank">
                {showingPortNumbers ? getHostAndPort(row.taskStatus.self) : getHostname(row.taskStatus.self)}
            </a>),
            sortable: true,
            grow: 3,
            minWidth: '30px',
            style: {overflow: 'auto'},
        },
        {
            name: 'State',
            selector: row => formatState(row.taskStatus.state, row.stats.fullyBlocked),
            sortable: true,
            minWidth: '80px',
        },
        ...(hasSplitStats ? [
            {
                name: (<span className="bi bi-pause-circle-fill" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Pending drivers" />),
                selector: row => row.stats.queuedNewDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-play-circle-fill" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Running drivers" />),
                selector: row => row.stats.runningNewDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-stop-circle-fill"
                             style={GLYPHICON_HIGHLIGHT} data-bs-toggle="tooltip"
                             data-bs-placement="top"
                             title="Blocked drivers" />),
                selector: row => row.stats.blockedDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-check-circle-fill" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Completed drivers" />),
                selector: row => row.stats.completedNewDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-pause-circle" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Pending splits"/>),
                selector: row => row.stats.queuedSplits,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-play-circle" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Running splits"/>),
                selector: row => row.stats.runningSplits,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-check-circle" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Completed splits"/>),
                selector: row => row.stats.completedSplits,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            }
        ] : [
            {
                name: (<span className="bi bi-pause-circle-fill" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Pending splits"/>),
                selector: row => row.stats.queuedDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-play-circle-fill" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Running splits"/>),
                selector: row => row.stats.runningDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-bookmark-check-fill"
                             style={GLYPHICON_HIGHLIGHT} data-bs-toggle="tooltip"
                             data-bs-placement="top"
                             title="Blocked splits"/>),
                selector: row => row.stats.blockedDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            },
            {
                name: (<span className="bi bi-check-lg" style={GLYPHICON_HIGHLIGHT}
                             data-bs-toggle="tooltip" data-bs-placement="top"
                             title="Completed splits"/>),
                selector: row => row.stats.completedDrivers,
                sortable: true,
                maxWidth: '50px',
                minWidth: '40px',
            }
        ]),
        {
            name: 'Rows',
            selector: row => row.stats.rawInputPositions,
            cell: row => formatCount(row.stats.rawInputPositions),
            sortable: true,
            minWidth: '75px',
        },
        {
            name: 'Rows/s',
            selector: row => computeRate(row.stats.rawInputPositions, calculateElapsedTime(row)),
            cell: row => formatCount(computeRate(row.stats.rawInputPositions, calculateElapsedTime(row))),
            sortable: true,
            minWidth: '75px',
        },
        {
            name: 'Bytes',
            selector: row => row.stats.rawInputDataSizeInBytes,
            cell: row => formatDataSizeBytes(row.stats.rawInputDataSizeInBytes),
            sortable: true,
            minWidth: '75px',
        },
        {
            name: 'Bytes/s',
            selector: row => computeRate(row.stats.rawInputDataSizeInBytes, calculateElapsedTime(row)),
            cell: row => formatDataSizeBytes(computeRate(row.stats.rawInputDataSizeInBytes, calculateElapsedTime(row))),
            sortable: true,
            minWidth: '75px',
        },
        {
            name: 'Elapsed',
            selector: row => parseDuration(row.stats.elapsedTimeInNanos + "ns"),
            cell: row => formatDuration(parseDuration(row.stats.elapsedTimeInNanos + "ns")),
            sortable: true,
            minWidth: '75px',
        },
        {
            name: 'CPU Time',
            selector: row => parseDuration(row.stats.totalCpuTimeInNanos + "ns"),
            cell: row => formatDuration(parseDuration(row.stats.totalCpuTimeInNanos + "ns")),
            sortable: true,
            minWidth: '75px',
        },
        {
            name: 'Buffered',
            selector: row => row.outputBuffers.totalBufferedBytes,
            cell: row => formatDataSizeBytes(row.outputBuffers.totalBufferedBytes),
            sortable: true,
            minWidth: '75px',
        },
    ];

    return (
        <DataTable columns={columns} data={tasks} theme='dark' customStyles={customStyles} striped='true'/>
    );
}

const BAR_CHART_WIDTH = 800;

const BAR_CHART_PROPERTIES = {
    type: 'bar',
    barSpacing: '0',
    height: '80px',
    barColor: '#747F96',
    zeroColor: '#8997B3',
    chartRangeMin: 0,
    tooltipClassname: 'sparkline-tooltip',
    tooltipFormat: 'Task {{offset:offset}} - {{value}}',
    disableHiddenCheck: true,
};

const HISTOGRAM_WIDTH = 175;

const HISTOGRAM_PROPERTIES = {
    type: 'bar',
    barSpacing: '0',
    height: '80px',
    barColor: '#747F96',
    zeroColor: '#747F96',
    zeroAxis: true,
    chartRangeMin: 0,
    tooltipClassname: 'sparkline-tooltip',
    tooltipFormat: '{{offset:offset}} -- {{value}} tasks',
    disableHiddenCheck: true,
};

class RuntimeStatsList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: false
        };
    }

    getExpandedIcon() {
        return this.state.expanded ? "bi bi-chevron-up" : "bi bi-chevron-down";
    }

    getExpandedStyle() {
        return this.state.expanded ? {} : {display: "none"};
    }

    toggleExpanded() {
        this.setState({
            expanded: !this.state.expanded,
        })
    }

    renderMetricValue(unit, value) {
        if (unit === "NANO") {
            return formatDuration(parseDuration(value + "ns"));
        }
        if (unit === "BYTE") {
            return formatDataSize(value);
        }
        return formatCount(value); // NONE
    }

    render() {
        return (
            <table className="table" id="runtime-stats-table">
                <tbody>
                <tr>
                    <th className="info-text">Metric Name</th>
                    <th className="info-text">Sum</th>
                    <th className="info-text">Count</th>
                    <th className="info-text">Min</th>
                    <th className="info-text">Max</th>
                    <th className="expand-charts-container">
                        <a onClick={this.toggleExpanded.bind(this)} className="expand-stats-button">
                            <span className={"bi " + this.getExpandedIcon()} style={GLYPHICON_HIGHLIGHT} data-bs-toggle="tooltip" data-bs-placement="top" title="Show metrics"/>
                        </a>
                    </th>
                </tr>
                {
                    Object
                        .values(this.props.stats)
                        .sort((m1, m2) => (m1.name.localeCompare(m2.name)))
                        .map((metric) =>
                            <tr style={this.getExpandedStyle()}>
                                <td className="info-text">{metric.name}</td>
                                <td className="info-text">{this.renderMetricValue(metric.unit, metric.sum)}</td>
                                <td className="info-text">{formatCount(metric.count)}</td>
                                <td className="info-text">{this.renderMetricValue(metric.unit, metric.min)}</td>
                                <td className="info-text">{this.renderMetricValue(metric.unit, metric.max)}</td>
                            </tr>
                        )
                }
                </tbody>
            </table>
        );
    }
}

class StageSummary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            expanded: false,
            lastRender: null,
            taskFilter: TASK_FILTER.ALL
        };
    }

    getExpandedIcon() {
        return this.state.expanded ? "bi bi-chevron-up" : "bi bi-chevron-down";
    }

    getExpandedStyle() {
        return this.state.expanded ? {} : {display: "none"};
    }

    toggleExpanded() {
        this.setState({
            expanded: !this.state.expanded,
        })
    }

    static renderHistogram(histogramId, inputData, numberFormatter) {
        const numBuckets = Math.min(HISTOGRAM_WIDTH, Math.sqrt(inputData.length));
        const dataMin = Math.min.apply(null, inputData);
        const dataMax = Math.max.apply(null, inputData);
        const bucketSize = (dataMax - dataMin) / numBuckets;

        let histogramData = [];
        if (bucketSize === 0) {
            histogramData = [inputData.length];
        }
        else {
            for (let i = 0; i < numBuckets + 1; i++) {
                histogramData.push(0);
            }

            for (let i in inputData) {
                const dataPoint = inputData[i];
                const bucket = Math.floor((dataPoint - dataMin) / bucketSize);
                histogramData[bucket] = histogramData[bucket] + 1;
            }
        }

        const tooltipValueLookups = {'offset': {}};
        for (let i = 0; i < histogramData.length; i++) {
            tooltipValueLookups['offset'][i] = numberFormatter(dataMin + (i * bucketSize)) + "-" + numberFormatter(dataMin + ((i + 1) * bucketSize));
        }

        const stageHistogramProperties = $.extend({}, HISTOGRAM_PROPERTIES, {barWidth: (HISTOGRAM_WIDTH / histogramData.length), tooltipValueLookups: tooltipValueLookups});
        $(histogramId).sparkline(histogramData, stageHistogramProperties);
    }

    componentDidUpdate() {
        const stage = this.props.stage;
        const numTasks = stage.latestAttemptExecutionInfo.tasks.length;

        // sort the x-axis
        stage.latestAttemptExecutionInfo.tasks.sort((taskA, taskB) => getTaskNumber(taskA.taskId) - getTaskNumber(taskB.taskId));

        const scheduledTimes = stage.latestAttemptExecutionInfo.tasks.map(task => parseDuration(task.stats.totalScheduledTimeInNanos + "ns"));
        const cpuTimes = stage.latestAttemptExecutionInfo.tasks.map(task => parseDuration(task.stats.totalCpuTimeInNanos + "ns"));

        // prevent multiple calls to componentDidUpdate (resulting from calls to setState or otherwise) within the refresh interval from re-rendering sparklines/charts
        if (this.state.lastRender === null || (Date.now() - this.state.lastRender) >= 1000) {
            const renderTimestamp = Date.now();
            const stageId = getStageNumber(stage.stageId);

            StageSummary.renderHistogram('#scheduled-time-histogram-' + stageId, scheduledTimes, formatDuration);
            StageSummary.renderHistogram('#cpu-time-histogram-' + stageId, cpuTimes, formatDuration);

            if (this.state.expanded) {
                // this needs to be a string otherwise it will also be passed to numberFormatter
                const tooltipValueLookups = {'offset': {}};
                for (let i = 0; i < numTasks; i++) {
                    tooltipValueLookups['offset'][i] = getStageNumber(stage.stageId) + "." + i;
                }

                const stageBarChartProperties = $.extend({}, BAR_CHART_PROPERTIES, {barWidth: BAR_CHART_WIDTH / numTasks, tooltipValueLookups: tooltipValueLookups});

                $('#scheduled-time-bar-chart-' + stageId).sparkline(scheduledTimes, $.extend({}, stageBarChartProperties, {numberFormatter: formatDuration}));
                $('#cpu-time-bar-chart-' + stageId).sparkline(cpuTimes, $.extend({}, stageBarChartProperties, {numberFormatter: formatDuration}));
            }

            this.setState({
                lastRender: renderTimestamp
            });
        }
    }

    renderStageExecutionAttemptsTasks(attempts) {
        return attempts.map(attempt => {
            return this.renderTaskList(attempt.tasks)
        });
    }

    renderTaskList(tasks) {
        tasks = this.state.expanded ? tasks : [];
        tasks = tasks.filter(task => this.state.taskFilter.predicate(task.taskStatus.state), this);
        return (
            <tr style={this.getExpandedStyle()}>
                <td colSpan="6">
                    <TaskList tasks={tasks}/>
                </td>
            </tr>
        );
    }

    renderTaskFilterListItem(taskFilter) {
        return (
            <li><a href="#" className={`dropdown-item text-dark ${this.state.taskFilter === taskFilter ? "selected" : ""}`}
                   onClick={this.handleTaskFilterClick.bind(this, taskFilter)}>{taskFilter.text}</a></li>
        );
    }

    handleTaskFilterClick(filter, event) {
        this.setState({
            taskFilter: filter
        });
        event.preventDefault();
    }

    renderTaskFilter() {
        return (<div className="row">
            <div className="col-6">
                <h3>Tasks</h3>
            </div>
            <div className="col-6">
                <table className="header-inline-links">
                    <tbody>
                    <tr>
                        <td>
                            <div className="btn-group text-right">
                                <button type="button" className="btn dropdown-toggle bg-white text-dark float-end text-right rounded-0"
                                        data-bs-toggle="dropdown" aria-haspopup="true"
                                        aria-expanded="false">
                                    Show: {this.state.taskFilter.text} <span className="caret"/>
                                </button>
                                <ul className="dropdown-menu bg-white text-dark rounded-0">
                                    {this.renderTaskFilterListItem(TASK_FILTER.ALL)}
                                    {this.renderTaskFilterListItem(TASK_FILTER.PLANNED)}
                                    {this.renderTaskFilterListItem(TASK_FILTER.RUNNING)}
                                    {this.renderTaskFilterListItem(TASK_FILTER.FINISHED)}
                                    {this.renderTaskFilterListItem(TASK_FILTER.FAILED)}
                                </ul>
                            </div>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>);

    }

    render() {
        const stage = this.props.stage;
        if (stage === undefined || !stage.hasOwnProperty('plan')) {
            return (
                <tr>
                    <td>Information about this stage is unavailable.</td>
                </tr>);
        }

        const totalBufferedBytes = stage.latestAttemptExecutionInfo.tasks
            .map(task => task.outputBuffers.totalBufferedBytes)
            .reduce((a, b) => a + b, 0);

        const stageId = getStageNumber(stage.stageId);

        return (
            <tr>
                <td className="stage-id">
                    <div className="stage-state-color" style={{borderLeftColor: getStageStateColor(stage)}}>{stageId}</div>
                </td>
                <td>
                    <table className="table single-stage-table">
                        <tbody>
                        <tr>
                            <td>
                                <table className="stage-table stage-table-time">
                                    <thead>
                                    <tr>
                                        <th className="stage-table-stat-title stage-table-stat-header">
                                            Time
                                        </th>
                                        <th/>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Scheduled
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.stats.totalScheduledTime}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Blocked
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.stats.totalBlockedTime}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            CPU
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.stats.totalCpuTime}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </td>
                            <td>
                                <table className="stage-table stage-table-memory">
                                    <thead>
                                    <tr>
                                        <th className="stage-table-stat-title stage-table-stat-header">
                                            Memory
                                        </th>
                                        <th/>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Cumulative
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {formatDataSize(stage.latestAttemptExecutionInfo.stats.cumulativeUserMemory / 1000)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Cumulative Total
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {formatDataSize(stage.latestAttemptExecutionInfo.stats.cumulativeTotalMemory / 1000)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Current
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.stats.userMemoryReservation}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Buffers
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {formatDataSize(totalBufferedBytes)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Peak
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.stats.peakUserMemoryReservation}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </td>
                            <td>
                                <table className="stage-table stage-table-tasks">
                                    <thead>
                                    <tr>
                                        <th className="stage-table-stat-title stage-table-stat-header">
                                            Tasks
                                        </th>
                                        <th/>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Pending
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.tasks.filter(task => task.taskStatus.state === "PLANNED").length}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Running
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.tasks.filter(task => task.taskStatus.state === "RUNNING").length}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Blocked
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.tasks.filter(task => task.stats.fullyBlocked).length}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="stage-table-stat-title">
                                            Total
                                        </td>
                                        <td className="stage-table-stat-text">
                                            {stage.latestAttemptExecutionInfo.tasks.length}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </td>
                            <td>
                                <table className="stage-table histogram-table">
                                    <thead>
                                    <tr>
                                        <th className="stage-table-stat-title stage-table-chart-header">
                                            Scheduled Time Skew
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="histogram-container">
                                            <span className="histogram" id={"scheduled-time-histogram-" + stageId}><div className="loader"/></span>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </td>
                            <td>
                                <table className="stage-table histogram-table">
                                    <thead>
                                    <tr>
                                        <th className="stage-table-stat-title stage-table-chart-header">
                                            CPU Time Skew
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="histogram-container">
                                            <span className="histogram" id={"cpu-time-histogram-" + stageId}><div className="loader"/></span>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </td>
                            <td className="expand-charts-container">
                                <a onClick={this.toggleExpanded.bind(this)} className="expand-charts-button">
                                    <span className={"bi " + this.getExpandedIcon()} style={GLYPHICON_HIGHLIGHT} data-bs-toggle="tooltip" data-bs-placement="top" title="More"/>
                                </a>
                            </td>
                        </tr>
                        <tr style={this.getExpandedStyle()}>
                            <td colSpan="6">
                                <table className="expanded-chart">
                                    <tbody>
                                    <tr>
                                        <td className="stage-table-stat-title expanded-chart-title">
                                            Task Scheduled Time
                                        </td>
                                        <td className="bar-chart-container">
                                            <span className="bar-chart" id={"scheduled-time-bar-chart-" + stageId}><div className="loader"/></span>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr style={this.getExpandedStyle()}>
                            <td colSpan="6">
                                <table className="expanded-chart">
                                    <tbody>
                                    <tr>
                                        <td className="stage-table-stat-title expanded-chart-title">
                                            Task CPU Time
                                        </td>
                                        <td className="bar-chart-container">
                                            <span className="bar-chart" id={"cpu-time-bar-chart-" + stageId}><div className="loader"/></span>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr style={this.getExpandedStyle()}>
                            <td colSpan="6">
                                {this.renderTaskFilter()}
                            </td>
                        </tr>
                        {this.renderStageExecutionAttemptsTasks([stage.latestAttemptExecutionInfo])}

                        {this.renderStageExecutionAttemptsTasks(stage.previousAttemptsExecutionInfos)}
                        </tbody>
                    </table>
                </td>
            </tr>);
    }
}

class StageList extends React.Component {
    getStages(stage) {
        if (stage === undefined || !stage.hasOwnProperty('subStages')) {
            return []
        }

        return [].concat.apply(stage, stage.subStages.map(this.getStages, this));
    }

    render() {
        const stages = this.getStages(this.props.outputStage);

        if (stages === undefined || stages.length === 0) {
            return (
                <div className="row">
                    <div className="col-12">
                        No stage information available.
                    </div>
                </div>
            );
        }

        const renderedStages = stages.map(stage => <StageSummary key={stage.stageId} stage={stage}/>);

        return (
            <div className="row">
                <div className="col-12">
                    <table className="table" id="stage-list">
                        <tbody>
                        {renderedStages}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}

const SMALL_SPARKLINE_PROPERTIES = {
    width: '100%',
    height: '57px',
    fillColor: '#3F4552',
    lineColor: '#747F96',
    spotColor: '#1EDCFF',
    tooltipClassname: 'sparkline-tooltip',
    disableHiddenCheck: true,
};

const TASK_FILTER = {
    ALL: {
        text: "All",
        predicate: function () { return true }
    },
    PLANNED: {
        text: "Planned",
        predicate: function (state) { return state === 'PLANNED' }
    },
    RUNNING: {
        text: "Running",
        predicate: function (state) { return state === 'RUNNING' }
    },
    FINISHED: {
        text: "Finished",
        predicate: function (state) { return state === 'FINISHED' }
    },
    FAILED: {
        text: "Aborted/Canceled/Failed",
        predicate: function (state) { return state === 'FAILED' || state === 'ABORTED' || state === 'CANCELED' }
    },
};

export class QueryDetail extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            query: null,
            lastSnapshotStages: null,

            lastScheduledTime: 0,
            lastCpuTime: 0,
            lastRowInput: 0,
            lastByteInput: 0,

            scheduledTimeRate: [],
            cpuTimeRate: [],
            rowInputRate: [],
            byteInputRate: [],

            reservedMemory: [],

            initialized: false,
            ended: false,

            lastRefresh: null,
            lastRender: null,

            stageRefresh: true,
        };

        this.refreshLoop = this.refreshLoop.bind(this);
    }

    static formatStackTrace(info) {
        return QueryDetail.formatStackTraceHelper(info, [], "", "");
    }

    static formatStackTraceHelper(info, parentStack, prefix, linePrefix) {
        let s = linePrefix + prefix + QueryDetail.failureInfoToString(info) + "\n";

        if (info.stack) {
            let sharedStackFrames = 0;
            if (parentStack !== null) {
                sharedStackFrames = QueryDetail.countSharedStackFrames(info.stack, parentStack);
            }

            for (let i = 0; i < info.stack.length - sharedStackFrames; i++) {
                s += linePrefix + "\tat " + info.stack[i] + "\n";
            }
            if (sharedStackFrames !== 0) {
                s += linePrefix + "\t... " + sharedStackFrames + " more" + "\n";
            }
        }

        if (info.suppressed) {
            for (let i = 0; i < info.suppressed.length; i++) {
                s += QueryDetail.formatStackTraceHelper(info.suppressed[i], info.stack, "Suppressed: ", linePrefix + "\t");
            }
        }

        if (info.cause) {
            s += QueryDetail.formatStackTraceHelper(info.cause, info.stack, "Caused by: ", linePrefix);
        }

        return s;
    }

    static countSharedStackFrames(stack, parentStack) {
        let n = 0;
        const minStackLength = Math.min(stack.length, parentStack.length);
        while (n < minStackLength && stack[stack.length - 1 - n] === parentStack[parentStack.length - 1 - n]) {
            n++;
        }
        return n;
    }

    static failureInfoToString(t) {
        return (t.message !== null) ? (t.type + ": " + t.message) : t.type;
    }

    resetTimer() {
        clearTimeout(this.timeoutId);
        // stop refreshing when query finishes or fails
        if (this.state.query === null || !this.state.ended) {
            // task.info-update-interval is set to 3 seconds by default
            this.timeoutId = setTimeout(this.refreshLoop, 3000);
        }
    }

    static getQueryURL(id) {
        if (!id || typeof id !== 'string' || id.length === 0) {
            return "/v1/query/undefined";
        }
        const sanitizedId = id.replace(/[^a-z0-9_]/gi, '');
        return sanitizedId.length > 0 ? `/v1/query/${encodeURIComponent(sanitizedId)}` : "/v1/query/undefined";
    }


    refreshLoop() {
        clearTimeout(this.timeoutId); // to stop multiple series of refreshLoop from going on simultaneously
        const queryId = getFirstParameter(window.location.search);

        $.get(QueryDetail.getQueryURL(queryId), function (query) {
            let lastSnapshotStages = this.state.lastSnapshotStage;
            if (this.state.stageRefresh) {
                lastSnapshotStages = query.outputStage;
            }

            let lastRefresh = this.state.lastRefresh;
            const lastScheduledTime = this.state.lastScheduledTime;
            const lastCpuTime = this.state.lastCpuTime;
            const lastRowInput = this.state.lastRowInput;
            const lastByteInput = this.state.lastByteInput;
            const alreadyEnded = this.state.ended;
            const nowMillis = Date.now();

            this.setState({
                query: query,
                lastSnapshotStage: lastSnapshotStages,

                lastScheduledTime: parseDuration(query.queryStats.totalScheduledTime),
                lastCpuTime: parseDuration(query.queryStats.totalCpuTime),
                lastRowInput: query.queryStats.processedInputPositions,
                lastByteInput: parseDataSize(query.queryStats.processedInputDataSize),

                initialized: true,
                ended: query.finalQueryInfo,

                lastRefresh: nowMillis,
            });

            // i.e. don't show sparklines if we've already decided not to update or if we don't have one previous measurement
            if (alreadyEnded || (lastRefresh === null && query.state === "RUNNING")) {
                this.resetTimer();
                return;
            }

            if (lastRefresh === null) {
                lastRefresh = nowMillis - parseDuration(query.queryStats.elapsedTime);
            }

            const elapsedSecsSinceLastRefresh = (nowMillis - lastRefresh) / 1000.0;
            if (elapsedSecsSinceLastRefresh >= 0) {
                const currentScheduledTimeRate = (parseDuration(query.queryStats.totalScheduledTime) - lastScheduledTime) / (elapsedSecsSinceLastRefresh * 1000);
                const currentCpuTimeRate = (parseDuration(query.queryStats.totalCpuTime) - lastCpuTime) / (elapsedSecsSinceLastRefresh * 1000);
                const currentRowInputRate = (query.queryStats.processedInputPositions - lastRowInput) / elapsedSecsSinceLastRefresh;
                const currentByteInputRate = (parseDataSize(query.queryStats.processedInputDataSize) - lastByteInput) / elapsedSecsSinceLastRefresh;
                this.setState({
                    scheduledTimeRate: addToHistory(currentScheduledTimeRate, this.state.scheduledTimeRate),
                    cpuTimeRate: addToHistory(currentCpuTimeRate, this.state.cpuTimeRate),
                    rowInputRate: addToHistory(currentRowInputRate, this.state.rowInputRate),
                    byteInputRate: addToHistory(currentByteInputRate, this.state.byteInputRate),
                    reservedMemory: addToHistory(parseDataSize(query.queryStats.userMemoryReservation), this.state.reservedMemory),
                });
            }
            this.resetTimer();
        }.bind(this))
            .fail(() => {
                this.setState({
                    initialized: true,
                });
                this.resetTimer();
            });
    }

    handleStageRefreshClick() {
        if (this.state.stageRefresh) {
            this.setState({
                stageRefresh: false,
                lastSnapshotStages: this.state.query.outputStage,
            });
        }
        else {
            this.setState({
                stageRefresh: true,
            });
        }
    }

    renderStageRefreshButton() {
        if (this.state.stageRefresh) {
            return <button className="btn btn-info live-button rounded-0" onClick={this.handleStageRefreshClick.bind(this)}>Auto-Refresh: On</button>
        }
        else {
            return <button className="btn btn-info live-button rounded-0" onClick={this.handleStageRefreshClick.bind(this)}>Auto-Refresh: Off</button>
        }
    }

    componentDidMount() {
        this.refreshLoop();
    }

    componentDidUpdate() {
        // prevent multiple calls to componentDidUpdate (resulting from calls to setState or otherwise) within the refresh interval from re-rendering sparklines/charts
        if (this.state.lastRender === null || (Date.now() - this.state.lastRender) >= 1000) {
            const renderTimestamp = Date.now();
            $('#scheduled-time-rate-sparkline').sparkline(this.state.scheduledTimeRate, $.extend({}, SMALL_SPARKLINE_PROPERTIES, {
                chartRangeMin: 0,
                numberFormatter: precisionRound
            }));
            $('#cpu-time-rate-sparkline').sparkline(this.state.cpuTimeRate, $.extend({}, SMALL_SPARKLINE_PROPERTIES, {chartRangeMin: 0, numberFormatter: precisionRound}));
            $('#row-input-rate-sparkline').sparkline(this.state.rowInputRate, $.extend({}, SMALL_SPARKLINE_PROPERTIES, {numberFormatter: formatCount}));
            $('#byte-input-rate-sparkline').sparkline(this.state.byteInputRate, $.extend({}, SMALL_SPARKLINE_PROPERTIES, {numberFormatter: formatDataSize}));
            $('#reserved-memory-sparkline').sparkline(this.state.reservedMemory, $.extend({}, SMALL_SPARKLINE_PROPERTIES, {numberFormatter: formatDataSize}));

            if (this.state.lastRender === null) {
                $('#query').each((i, block) => {
                    hljs.highlightBlock(block);
                });

                $('#prepared-query').each((i, block) => {
                    hljs.highlightBlock(block);
                });
            }

            this.setState({
                lastRender: renderTimestamp,
            });
        }

        $('[data-bs-toggle="tooltip"]')?.tooltip?.();
        new Clipboard('.copy-button');
    }

    renderStages() {
        if (this.state.lastSnapshotStage === null) {
            return;
        }

        return (
            <div>
                <div className="row">
                    <div className="col-9">
                        <h3>Stages</h3>
                    </div>
                    <div className="col-3">
                        <table className="header-inline-links">
                            <tbody>
                            <tr>
                                <td>
                                    {this.renderStageRefreshButton()}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="row">
                    <div className="col-12">
                        <StageList key={this.state.query.queryId} outputStage={this.state.lastSnapshotStage}/>
                    </div>
                </div>
            </div>
        );
    }

    renderPreparedQuery() {
        const query = this.state.query;
        if (!query.hasOwnProperty('preparedQuery') || query.preparedQuery === null) {
            return;
        }

        return (
            <div className="col-12">
                <h3>
                    Prepared Query
                    <a className="btn copy-button" data-clipboard-target="#prepared-query-text" data-bs-toggle="tooltip" data-bs-placement="right" title="Copy to clipboard">
                        <span className="bi bi-copy" aria-hidden="true" alt="Copy to clipboard"/>
                    </a>
                </h3>
                <pre id="prepared-query">
                    <code className="lang-sql" id="prepared-query-text">
                        {query.preparedQuery}
                    </code>
                </pre>
            </div>
        );
    }

    renderSessionProperties() {
        const query = this.state.query;

        const properties = [];
        for (let property in query.session.systemProperties) {
            if (query.session.systemProperties.hasOwnProperty(property)) {
                properties.push(
                    <span>- {property + "=" + query.session.systemProperties[property]} <br/></span>
                );
            }
        }

        for (let catalog in query.session.catalogProperties) {
            if (query.session.catalogProperties.hasOwnProperty(catalog)) {
                for (let property in query.session.catalogProperties[catalog]) {
                    if (query.session.catalogProperties[catalog].hasOwnProperty(property)) {
                        properties.push(
                            <span>- {catalog + "." + property + "=" + query.session.catalogProperties[catalog][property]} <br/></span>
                        );
                    }
                }
            }
        }

        return properties;
    }

    renderResourceEstimates() {
        const query = this.state.query;
        const estimates = query.session.resourceEstimates;
        const renderedEstimates = [];

        for (let resource in estimates) {
            if (estimates.hasOwnProperty(resource)) {
                const upperChars = resource.match(/([A-Z])/g) || [];
                let snakeCased = resource;
                for (let i = 0, n = upperChars.length; i < n; i++) {
                    snakeCased = snakeCased.replace(new RegExp(upperChars[i]), '_' + upperChars[i].toLowerCase());
                }

                renderedEstimates.push(
                    <span>- {snakeCased + "=" + query.session.resourceEstimates[resource]} <br/></span>
                )
            }
        }

        return renderedEstimates;
    }

    renderWarningInfo() {
        const query = this.state.query;
        if (query.warnings.length > 0) {
            return (
                <div className="row">
                    <div className="col-12">
                        <h3>Warnings</h3>
                        <hr className="h3-hr"/>
                        <table className="table" id="warnings-table">
                            {query.warnings.map((warning) =>
                                <tr>
                                    <td>
                                        {warning.warningCode.name}
                                    </td>
                                    <td>
                                        {warning.message}
                                    </td>
                                </tr>
                            )}
                        </table>
                    </div>
                </div>
            );
        }
        else {
            return null;
        }
    }

    renderRuntimeStats() {
        const query = this.state.query;
        if (query.queryStats.runtimeStats === undefined) {
            return null;
        }
        if (Object.values(query.queryStats.runtimeStats).length == 0) {
            return null;
        }
        return (
            <div className="row">
                <div className="col-6">
                    <h3>Runtime Statistics</h3>
                    <hr className="h3-hr"/>
                    <RuntimeStatsList stats={query.queryStats.runtimeStats}/>
                </div>
            </div>
        );
    }

    renderFailureInfo() {
        const query = this.state.query;
        if (query.failureInfo) {
            return (
                <div className="row">
                    <div className="col-12">
                        <h3>Error Information</h3>
                        <hr className="h3-hr"/>
                        <table className="table">
                            <tbody>
                            <tr>
                                <td className="info-title">
                                    Error Type
                                </td>
                                <td className="info-text">
                                    {query.errorType}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Error Code
                                </td>
                                <td className="info-text">
                                    {query.errorCode.name + " (" + this.state.query.errorCode.code + ")"}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Stack Trace
                                    <a className="btn copy-button" data-clipboard-target="#stack-trace" data-bs-toggle="tooltip" data-bs-placement="right"
                                       title="Copy to clipboard">
                                        <span className="bi bi-copy" aria-hidden="true" alt="Copy to clipboard"/>
                                    </a>
                                </td>
                                <td className="info-text">
                                        <pre id="stack-trace">
                                            {QueryDetail.formatStackTrace(query.failureInfo)}
                                        </pre>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        else {
            return "";
        }
    }

    render() {
        const query = this.state.query;

        if (query === null || this.state.initialized === false) {
            let label = (<div className="loader">Loading...</div>);
            if (this.state.initialized) {
                label = "Query not found";
            }
            return (
                <div className="row error-message">
                    <div className="col-12"><h4>{label}</h4></div>
                </div>
            );
        }

        return (
            <div>
                <QueryHeader query={query}/>
                <div className="row mt-3">
                    <div className="col-6">
                        <h3>Session</h3>
                        <hr className="h3-hr"/>
                        <table className="table">
                            <tbody>
                            <tr>
                                <td className="info-title">
                                    User
                                </td>
                                <td className="info-text wrap-text">
                                    <span id="query-user">{query.session.user}</span>
                                    &nbsp;&nbsp;
                                    <a href="#" className="copy-button" data-clipboard-target="#query-user" data-bs-toggle="tooltip" data-bs-placement="right"
                                       title="Copy to clipboard">
                                        <span className="bi bi-copy" aria-hidden="true" alt="Copy to clipboard"/>
                                    </a>
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Principal
                                </td>
                                <td className="info-text wrap-text">
                                    {query.session.principal}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Source
                                </td>
                                <td className="info-text wrap-text">
                                    {query.session.source}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Catalog
                                </td>
                                <td className="info-text">
                                    {query.session.catalog}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Schema
                                </td>
                                <td className="info-text">
                                    {query.session.schema}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Client Address
                                </td>
                                <td className="info-text">
                                    {query.session.remoteUserAddress}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Client Tags
                                </td>
                                <td className="info-text">
                                    {query.session.clientTags.join(", ")}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Session Properties
                                </td>
                                <td className="info-text wrap-text">
                                    {this.renderSessionProperties()}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Resource Estimates
                                </td>
                                <td className="info-text wrap-text">
                                    {this.renderResourceEstimates()}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="col-6">
                        <h3>Execution</h3>
                        <hr className="h3-hr"/>
                        <table className="table">
                            <tbody>
                            <tr>
                                <td className="info-title">
                                    Resource Group
                                </td>
                                <td className="info-text wrap-text">
                                    {query.resourceGroupId ? query.resourceGroupId.join(".") : "n/a"}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Submission Time
                                </td>
                                <td className="info-text">
                                    {formatShortDateTime(new Date(query.queryStats.createTime))}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Completion Time
                                </td>
                                <td className="info-text">
                                    {new Date(query.queryStats.endTime).getTime() !== 0 ? formatShortDateTime(new Date(query.queryStats.endTime)) : ""}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Elapsed Time
                                </td>
                                <td className="info-text">
                                    {query.queryStats.elapsedTime}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Prerequisites Wait Time
                                </td>
                                <td className="info-text">
                                    {query.queryStats.waitingForPrerequisitesTime}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Queued Time
                                </td>
                                <td className="info-text">
                                    {query.queryStats.queuedTime}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Planning Time
                                </td>
                                <td className="info-text">
                                    {query.queryStats.totalPlanningTime}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Execution Time
                                </td>
                                <td className="info-text">
                                    {query.queryStats.executionTime}
                                </td>
                            </tr>
                            <tr>
                                <td className="info-title">
                                    Coordinator
                                </td>
                                <td className="info-text">
                                    {getHostname(query.self)}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="row">
                    <div className="col-12">
                        <div className="row">
                            <div className="col-6">
                                <h3>Resource Utilization Summary</h3>
                                <hr className="h3-hr"/>
                                <table className="table">
                                    <tbody>
                                    <tr>
                                        <td className="info-title">
                                            CPU Time
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.totalCpuTime}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Scheduled Time
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.totalScheduledTime}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Blocked Time
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.totalBlockedTime}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Input Rows
                                        </td>
                                        <td className="info-text">
                                            {formatCount(query.queryStats.processedInputPositions)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Input Data
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.processedInputDataSize}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Raw Input Rows
                                        </td>
                                        <td className="info-text">
                                            {formatCount(query.queryStats.rawInputPositions)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Raw Input Data
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.rawInputDataSize}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            <span className="text" data-bs-toggle="tooltip" data-bs-placement="right"
                                                  title="The total number of rows shuffled across all query stages">
                                                Shuffled Rows
                                            </span>
                                        </td>
                                        <td className="info-text">
                                            {formatCount(query.queryStats.shuffledPositions)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            <span className="text" data-bs-toggle="tooltip" data-bs-placement="right"
                                                  title="The total number of bytes shuffled across all query stages">
                                                Shuffled Data
                                            </span>
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.shuffledDataSize}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Peak User Memory
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.peakUserMemoryReservation}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Peak Total Memory
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.peakTotalMemoryReservation}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Memory Pool
                                        </td>
                                        <td className="info-text">
                                            {query.memoryPool}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Cumulative User Memory
                                        </td>
                                        <td className="info-text">
                                            {formatDataSize(query.queryStats.cumulativeUserMemory / 1000.0)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Cumulative Total
                                        </td>
                                        <td className="info-text">
                                            {formatDataSize(query.queryStats.cumulativeTotalMemory / 1000.0)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Output Rows
                                        </td>
                                        <td className="info-text">
                                            {formatCount(query.queryStats.outputPositions)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Output Data
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.outputDataSize}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Written Output Rows
                                        </td>
                                        <td className="info-text">
                                            {formatCount(query.queryStats.writtenOutputPositions)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Written Output Logical Data Size
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.writtenOutputLogicalDataSize}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Written Output Physical Data Size
                                        </td>
                                        <td className="info-text">
                                            {query.queryStats.writtenOutputPhysicalDataSize}
                                        </td>
                                    </tr>
                                    {parseDataSize(query.queryStats.spilledDataSize) > 0 &&
                                        <tr>
                                            <td className="info-title">
                                                Spilled Data
                                            </td>
                                            <td className="info-text">
                                                {query.queryStats.spilledDataSize}
                                            </td>
                                        </tr>
                                    }
                                    </tbody>
                                </table>
                            </div>
                            <div className="col-6">
                                <h3>Timeline</h3>
                                <hr className="h3-hr"/>
                                <table className="table">
                                    <tbody>
                                    <tr>
                                        <td className="info-title">
                                            Parallelism
                                        </td>
                                        <td rowSpan="2">
                                            <div className="query-stats-sparkline-container">
                                                <span className="sparkline" id="cpu-time-rate-sparkline"><div className="loader">Loading ...</div></span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="tr-noborder">
                                        <td className="info-sparkline-text">
                                            {formatCount(this.state.cpuTimeRate[this.state.cpuTimeRate.length - 1])}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Scheduled Time/s
                                        </td>
                                        <td rowSpan="2">
                                            <div className="query-stats-sparkline-container">
                                                <span className="sparkline" id="scheduled-time-rate-sparkline"><div className="loader">Loading ...</div></span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="tr-noborder">
                                        <td className="info-sparkline-text">
                                            {formatCount(this.state.scheduledTimeRate[this.state.scheduledTimeRate.length - 1])}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Input Rows/s
                                        </td>
                                        <td rowSpan="2">
                                            <div className="query-stats-sparkline-container">
                                                <span className="sparkline" id="row-input-rate-sparkline"><div className="loader">Loading ...</div></span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="tr-noborder">
                                        <td className="info-sparkline-text">
                                            {formatCount(this.state.rowInputRate[this.state.rowInputRate.length - 1])}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Input Bytes/s
                                        </td>
                                        <td rowSpan="2">
                                            <div className="query-stats-sparkline-container">
                                                <span className="sparkline" id="byte-input-rate-sparkline"><div className="loader">Loading ...</div></span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="tr-noborder">
                                        <td className="info-sparkline-text">
                                            {formatDataSize(this.state.byteInputRate[this.state.byteInputRate.length - 1])}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="info-title">
                                            Memory Utilization
                                        </td>
                                        <td rowSpan="2">
                                            <div className="query-stats-sparkline-container">
                                                <span className="sparkline" id="reserved-memory-sparkline"><div className="loader">Loading ...</div></span>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="tr-noborder">
                                        <td className="info-sparkline-text">
                                            {formatDataSize(this.state.reservedMemory[this.state.reservedMemory.length - 1])}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                {this.renderRuntimeStats()}
                {this.renderWarningInfo()}
                {this.renderFailureInfo()}
                <div className="row">
                    <div className="col-12">
                        <h3>
                            Query
                            <a className="btn copy-button" data-clipboard-target="#query-text" data-bs-toggle="tooltip" data-bs-placement="right" title="Copy to clipboard">
                                <span className="bi bi-copy" aria-hidden="true" alt="Copy to clipboard"/>
                            </a>
                        </h3>
                        <pre id="query">
                            <code className="lang-sql" id="query-text">
                                {query.query}
                            </code>
                        </pre>
                    </div>
                    {this.renderPreparedQuery()}
                </div>
                {this.renderStages()}
            </div>
        );
    }
}

export default QueryDetail;

