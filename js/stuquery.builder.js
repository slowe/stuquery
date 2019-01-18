var functions = {};
var ls = new Array();

S(document).ready(function(){

	var fullcode = "";
	var outcode = "";
	var mincode = "";
	var shorter = false;

	function save(e){

		// Bail out if there is no Blob function
		if(typeof Blob!=="function") return this;
		var txt,ch,t,f;
		var src = S(e.currentTarget).attr('href');
		var min = (src.search(/\.min\.js/) > 0);
		var fileNameToSaveAs = getFileName(min);
		var textFileAsBlob = new Blob([(min ? mincode : outcode)], {type:'text/plain'});

		function destroyClickedElement(event){ document.body.removeChild(event.target); }

		var dl = document.createElement("a");
		dl.download = fileNameToSaveAs;
		dl.innerHTML = "Download File";
		if(window.webkitURL != null){
			// Chrome allows the link to be clicked
			// without actually adding it to the DOM.
			dl.href = window.webkitURL.createObjectURL(textFileAsBlob);
		}else{
			// Firefox requires the link to be added to the DOM
			// before it can be clicked.
			dl.href = window.URL.createObjectURL(textFileAsBlob);
			dl.onclick = destroyClickedElement;
			dl.style.display = "none";
			document.body.appendChild(dl);
		}
		dl.click();
	}

	function buildForm(){
		var q = S();
		var form = '';
		for(x in q){
			if(typeof q[x]==="function"){
				key = '.'+x
				form += '<input type="checkbox" name="function" value="'+key+'" checked="checked" />'+key+'()<br />';
			}
		}
		S('#builder').html(form);
		S('#builder input').on('change',function(){
			update(this);
		});
		S('#save').on('click',function(e){
			e.preventDefault();
			save(e);
		});
		S('#minify').on('click',function(e){
			e.preventDefault();
			save(e);
		});
	}
	function whichFunctionsRequire(f,lines){
		var i,idx,idx2,idx3,neededby;
		neededby = new Array();
		if(!f) return neededby;
		for(var i = 0; i < lines.length; i++){
			// find uses of the function
			l = lines[i].replace(/\/\/.*$/,"");
			idx = l.search(new RegExp("\\W"+f+"\\s?\\("));	// Matches a use of the function
			idx2 = l.search(new RegExp("function "+f+"\\s?\\("));	// Not a function declaration
			idx3 = l.search(new RegExp("prototype"+f+"\\s*="));	// Not a prototype
			if(idx >= 0 && idx2 < 0 && idx3 < 0 && ls[i]) neededby.push(ls[i]);
		}
		return neededby;
	}
	function update(el){
		var v,i;
		if(!el) el = S('#builder input');
		var lines = fullcode.split(/\n/);
		shorter = false;

		var linestoremove = new Array();

		for(i = 0; i < el.length; i++){
			v = S(el[i]).attr('value');
			if(functions[v]){
				if(!el[i].checked){
					functions[v].required = false;
					for(var j = functions[v].start; j <= functions[v].end; j++) linestoremove.push(j);
				}else{
					functions[v].required = true;
				}
			}
		}

		// Loop over internal functions and find out which ones we no longer need
		for(f in functions){
			// Only care about internal functions
			if(functions[f].internal){
				if(functions[f].neededby){
					required = functions[f].neededby.length;
					for(var i = 0; i < functions[f].neededby.length; i++){
						fn = functions[functions[f].neededby[i]];
						if(!fn.internal){
							if(!fn.required) required--;
						}
					}
					if(required == 0){
						functions[f].required = false;
						for(var j = functions[f].start; j <= functions[f].end; j++) linestoremove.push(j);
					}
				}
			}
		}

		linestoremove = linestoremove.sort(function(a,b){ return a > b; });
		if(linestoremove.length > 0) shorter = true;
		
		// Zap line rather than remove it because we need to keep in sync with ls array
		for(var i = linestoremove.length-1; i >= 0; i--) lines[linestoremove[i]] = "";
		
		// Loop over each internal function
		for(var f in functions){
			var n = whichFunctionsRequire(f,lines);
			if(n.length > 0) functions[f].neededby = n;
		}

		txt = lines.join('\n');
		S('#output').html(txt);
		// Convert HTML back
		outcode = txt.replace(/<[^\>]+>/g,"");
		outcode = outcode.replace(/\&gt\;/g, ">").replace(/\&lt\;/g, "<").replace(/\&amp;/g, '&').replace(/[\n\r]+/g,"\n");

		S('#output').html(html(outcode));

		var min = UglifyJS.parse(outcode);
		mincode = min.print_to_string();

		// Update DOM elements
		S('#size').html((outcode.length/1000).toFixed(1));
		S('#sizemin').html((mincode.length/1000).toFixed(1));
		S('#file').html(getFileName());
		S('#filemin').html(getFileName(true));
	}
	function getFileName(minified){
		return "stuquery."+(shorter ? "reduced." : "")+(minified ? "min.":"")+"js";
	}
	function html(s) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	function success(data,a){
		var lines = data.split(/[\n\r]/);
		var fn = "";
		var indent = "";
		// We'll assume well-formed style for simplicity so all internal
		// functions that can be removed are one tab stop deep
		var infunction = false;
		for(var i = 0; i < lines.length; i++){
			a = lines[i].match(/^\tfunction ([^\(]+)\(/);
			if(a && a.length == 2){
				fn = a[1];
				infunction = true;
				functions[fn] = {'start':i,'end':i,'internal':true};
			}
			if(infunction && lines[i].search(/^\t\}/) == 0){
				infunction = false;
				functions[fn]['end'] = i;
				fn = "";
			}
		}
		
		fn = "";

		// Process prototype functions (we should already have them)
		for(var i = 0; i < lines.length; i++){
			lines[i] = html(lines[i]);
			var a = lines[i].match(/stuQuery.prototype(\.[^\s\=]+)\s*\=/);
			if(a && a.length == 2){
				var idx = lines[i].indexOf("stuQuery.prototype"+a[1]);
				if(idx >= 0){
					// This is the start of a function
					indent = lines[i].substr(0,idx);
					fn = a[1];
					functions[fn] = {'start':i,'end':i,'internal':false};
					j = 0;
				}
			}
			if(fn){
				if(lines[i].indexOf(indent+'}')==0 || (j==0 && lines[i][lines[i].length-1] == '}')){
					functions[fn]['end'] = i;
					fn = "";
					indent = "";
				}
				j++;
			}
		}
		ls = new Array(lines.length);
		for(f in functions){
			for(var i = functions[f].start; i <= functions[f].end; i++) ls[i] = f;
		}
		data = lines.join("\n");
		fullcode = data;
		S('#output').html(data);
		update();
		buildForm();

	}

	function error(e,a){
		S('#output').append('<p>Failed to load '+a.url+'<\/p>');
	}
	S().ajax("js/stuquery.js",{'complete': success, 'error': error });

});