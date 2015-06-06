var d3 = require('d3');

// This component draws a sortable table. 
// Clicking the header causes the sort to change
//
// Usage:
// 1. Create the component and set header and sorting column
//
//		var myTable = Table()
//			.headers([{
//				column: "name", 				-> This is the data attribute for this column
//				text: "Name",					-> Text will appear in the row header
//				class:	"col-md-8 text-right",	-> These classes will be applied		
//				type: "String",					-> Choose right compare function for sorting
//				sortable: true },{				-> Is this column sortable?
//				column: "age", 
//				text: "Age",
//				class: "col-md-4",
//				type: "Number",
//				sortable: true }])	
//			.sortingColumn(1); 			-> Sorting on age 
//
// 2. Bind the data to the table element and then call table on it.
//    The data is an array of objects that correspond to the rows. 
//	  Each row will display the values specified in the headers array, 
//    in the order of the headers array.
//	
//		dataTable = d3.select('table#myTable')
//			.datum(data)
//			.call(myTable);

var Table = function() {

	var headers = []; 			// Need to set headers
	var sortColumn = null; 		// Default: No sort. Set to column for sorting
	var sortAscending = true;
	var rowHoverHandler = null; // Function called on row hover

	var table = function(selection) {
		selection.each(function(data) {
			var thisTable = d3.select(this);

			// Clear table
			thisTable.select("thead").remove();
			thisTable.select("tbody").remove();

			// Header
			var header = thisTable
			  .append("thead")
			  .append("tr");

			if (headers.length > 0) {
				header.selectAll("th")
				.data(headers)
			  .enter().append("th")
			  	.attr("class", function(d) { return d.class; })
			  	.html(function (d, i) { 
			  		var sortIndicator = (i == sortColumn) ? (sortAscending ? ' &uarr;' : ' &darr;') : '';
			  		return d.text + sortIndicator; 
			  	})
			  	.on("click", function(d, i) { // Function to change sort order
			  		if (sortColumn == i) {
			  			sortAscending = !sortAscending;
			  		} else {
			  			sortAscending = true;
			  			sortColumn = i;
			  		}

			  		// Redraw
			  		thisTable.select("tbody").remove();
			  		thisTable.call(table);
			  	});
			} else {
				alert("Please set some headers for the table");
			}

			// Rows
			var tr = d3.select(this)
			  .append("tbody")
				.selectAll("tr")
				.data(data)
			  .enter().append("tr")
			  .on("mouseover", rowHoverHandler);

			// Sort rows if sortColumn is set
			if (sortColumn > -1) {
				var sortType = headers[sortColumn].type;
				var sortAttr = headers[sortColumn].column;
				if (sortType === "Number") {
					tr.sort(function (a, b) { return a == null || b == null ? 0 : numberCompare(a[sortAttr], b[sortAttr]); });											
				} else {
					tr.sort(function (a, b) { return a == null || b == null ? 0 : stringCompare(a[sortAttr], b[sortAttr]); });					
				}
			} 

			// Table cells
			var td = tr.selectAll("td")
				.data(function(d) { 
					var row = headers.map(function(h) {
						return d[h.column];
					});
					return row; 
				})
			  .enter().append("td")
			  	.attr("class", function(d,i) { return headers[i].class; })
			    .text(function(d) { return d; });
		});
	}

	table.headers = function(value) {
		if (!arguments.length) {
			return headers;
		}
		headers = value;
		return table;
	}

	table.sortColumn = function(value) {
		if (!arguments.length) {
			return sortColumn;
		}
		sortColumn = value;
		return table;
	}

	table.sortAscending = function(value) {
		if (!arguments.length) {
			return sortAscending;
		}
		sortAscending = value;
		return table;
	}

	table.rowHoverHandler = function(value) {
		if (!arguments.length) {
			return rowHoverHandler;
		}
		rowHoverHandler = value;
		return table;
	}

	// Compares two numbers depending on sortAscending. 
	function numberCompare(a, b) {
	    if (sortAscending) {
	    	return a - b;
	    } else {
	    	return b - a;
	    }
	}

	// Compares two strings depending on sortAscending. 
	function stringCompare(a, b) {
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