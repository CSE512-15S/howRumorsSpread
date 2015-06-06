var d3 = require('d3');

// This component draws a sortable table. 
// Clicking the header causes the sort to change
//
// Usage:
// 1. Create the component and set header and sorting column
//
//		var myTable = Table()
//			.headerTitles(["Name", "Age"])
//			.sortingColumn(1);
//
// 2. Bind the data to the table element and then call table on it.
//    The data is an array with arrays that each has length headers.length
//	  Each element of data corresponds to a row.
//	
//		dataTable = d3.select('table#myTable')
//			.datum(data)
//			.call(myTable);
//
// 3. To update...

var Table = function() {

	var headerTitles = []; 	// Need to set headers
	var sortColumn = -1; 	// Default: No sort
	var sortAscending = true;

	var table = function(selection) {
		selection.each(function(data) {
			// Clear table
			d3.select(this).select("thead").remove();
			d3.select(this).select("tbody").remove();

			// Header
			var header = d3.select(this)
			  .append("thead")
			  .append("tr");

			var headers; 
			if (headerTitles.length > 0) {
				var headers = header.selectAll("tr")
				.data(headerTitles)
			  .enter().append("tr")
			  	.html(function (d) { return d; });

			  	// TODO add event handler for clicking the header to change the sort
			} else {
				alert("Please set some headers for the table");
			}

			// Rows
			var tr = d3.select(this)
			  .append("thead")
				.selectAll("tr")
				.data(data)
			  .enter().append("tr");

			// Sort rows if sortColumn is set
			if (sortColumn > -1) {
			  	tr.sort(function (a, b) { return a == null || b == null ? 0 : stringCompare(a[sortColumn], b[sortColumn]); });
			} 

			// Table cells
			var td = tr.selectAll("td")
				.data(function(d) { return d; })
			  .enter().append("td")
			    .text(function(d) { return d; });
		});
	}

	table.headerTitles = function(value) {
		if (!arguments.length) {
			return headerTitles;
		}
		headerTitles = value;
		return table;
	}

	table.sortColumn = function(value) {
		if (!arguments.length) {
			return sortColumn;
		}
		sortColumn = value;
		return table;
	}

	table.sortDescending = function(value) {
		if (!arguments.length) {
			return sortDescending;
		}
		sortDescending = value;
		return table;
	}

	// Compares two strings depending on sortAscending. 
	function stringCompare(a, b) {
		console.log("a: " + a + ", b: " + b);
	    a = a.toLowerCase();
	    b = b.toLowerCase();
	    if (sortAscending) {
	    	return a > b ? 1 : a == b ? 0 : -1;
	    } else {
	    	return a > b ? -1 : a == b ? 0 : 1;
	    }
	}

	return table;
}

module.exports = Table;