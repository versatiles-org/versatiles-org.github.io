
EventTarget.prototype.on = function (type, callback) { this.addEventListener(type, callback) }
Array.prototype.isIndexInner = function (index) { return (index > 0) && (index < this.length - 1) }

export { Chart } from "./chart.js"
