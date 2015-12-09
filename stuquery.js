// I don't like to pollute the global namespace 
// but I can't get this to work any other way.
var eventcache = {};
function E(e){
	
	function matchSelector(e,selector){
		var result = false;
		// Does this one element match the selector
		if(selector[0] == '.'){
			selector = selector.substr(1);
			for(var i = 0; i < e.classList.length; i++) if(e.classList[i] == selector) return true;
		}else if(selector[0] == '#'){
			if(e.id == selector.substr(1)) return true;
		}else{
			if(e.tagName == selector.substr(1).toUpperCase()) return true;
		}
		return false;
	}
	function getBy(e,selector){
		var i = -1;
		var result = new Array();
		if(selector.indexOf(':eq') > 0){
			var m = selector.replace(/(.*)\:eq\(([0-9]+)\)/,'$1 $2').split(" ");
			selector = m[0];
			i = parseInt(m[1]);
		}
		if(selector[0] == '.') els = e.getElementsByClassName(selector.substr(1));
		else if(selector[0] == '#') els = e.getElementById(selector.substr(1));
		else els = e.getElementsByTagName(selector);
		if(!els) els = [];
		
		// If it is a select field we don't want to select the options within it
		if(els.nodeName && els.nodeName=="SELECT") result.push(els);
		else{
			if(typeof els.length!=="number") els = [els];
			for(k = 0; k < els.length; k++){ result.push(els[k]); }
			if(i >= 0 && result.length > 0){
				if(i < result.length) result = [result[i]];
				else result = [];
			}
		}
		return result;
	}

	// Make our own fake, tiny, version of jQuery simulating the parts we need
	function stuQuery(els){
		if(typeof els==="string"){
			var a,els,els2,i,j,k,tmp;
			a = els.split(' ');
			for(i = 0; i < a.length; i++){
				if(i==0){
					els = getBy(document,a[i]);
				}else{
					els2 = new Array();
					for(j = 0; j < els.length; j++) els2 = els2.concat(getBy(els[j],a[i]));
					els = els2.splice(0);
				}
			}
		}
		this.e = [];
		if(!els) return this;
		if(typeof els.length!=="number") els = [els];
		this.e = els;
		return this;
	}
	stuQuery.prototype.ready = function(f){ /in/.test(document.readyState)?setTimeout('E(document).ready('+f+')',9):f() }
	// Return HTML or set the HTML
	stuQuery.prototype.html = function(html){
		if(typeof html==="number") html = ''+html;
		if(typeof html!=="string" && this.e.length == 1) return this.e[0].innerHTML;
		if(typeof html==="string") for(var i = 0; i < this.e.length; i++) this.e[i].innerHTML = html;
		return this;
	}
	stuQuery.prototype.append = function(html){
		if(!html && this.e.length == 1) return this.e[0].innerHTML;
		if(html) for(var i = 0; i < this.e.length; i++) this.e[i].innerHTML += html;
		return this;	
	}
	stuQuery.prototype.setCache = function(a){
		eventcache = a;
		return;
	}
	function NodeMatch(a,el){
		if(a && a.length > 0){
			for(var i = 0; i < a.length; i++){
				if(a[i].node == el) return {'success':true,'match':i};
			}
		}
		return {'success':false};
	}
	function storeEvents(e,event,fn,fn2,data){
		if(!eventcache[event]) eventcache[event] = new Array();
		eventcache[event].push({'node':e,'fn':fn,'fn2':fn2,'data':data});
	}
	function getEvent(e){
		if(eventcache[e.type]){
			var m = NodeMatch(eventcache[e.type],e.currentTarget);
			if(m.success){
				if(m.match.data) e.data = eventcache[e.type][m.match].data;
				return {'fn':eventcache[e.type][m.match].fn,'data':e};
			}
		}
		return function(){ return {'fn':''}; }
	}
	// Try to remove an event with attached data and supplied function, fn.
	stuQuery.prototype.off = function(event){

		// If the remove function doesn't exist, we make it
		if(typeof Element.prototype.removeEventListener !== "function"){
			Element.prototype.removeEventListener = function (sEventType, fListener /*, useCapture (will be ignored!) */) {
				if (!oListeners.hasOwnProperty(sEventType)) { return; }
				var oEvtListeners = oListeners[sEventType];
				for (var nElIdx = -1, iElId = 0; iElId < oEvtListeners.aEls.length; iElId++) {
					if (oEvtListeners.aEls[iElId] === this) { nElIdx = iElId; break; }
				}
				if (nElIdx === -1) { return; }
				for (var iLstId = 0, aElListeners = oEvtListeners.aEvts[nElIdx]; iLstId < aElListeners.length; iLstId++) {
					if (aElListeners[iLstId] === fListener) { aElListeners.splice(iLstId, 1); }
				}
			}
		}
		for(var i = 0; i < this.e.length; i++){
			var m = NodeMatch(eventcache[event],this.e[i]);
			if(m.success){
				this.e[i].removeEventListener(event,eventcache[event][m.match].fn2,false);
				eventcache[event].splice(m.match,1);
			}
		}
		return this;
	}
	// Add events
	stuQuery.prototype.on = function(event,data,fn){
		event = event || window.event; // For IE
		this.cache = [4,5,6];
		if(typeof data==="function" && !fn){
			fn = data;
			data = "";
		}
		if(typeof fn !== "function") return this;

		if(this.e.length > 0){
			var _obj = this;
			var a = function(b){
				var e = getEvent({'currentTarget':this,'type':event,'data':data,'originalEvent':b});
				if(typeof e.fn === "function") return e.fn.call(_obj,e.data);
			}
		
			for(var i = 0; i < this.e.length; i++){
				storeEvents(this.e[i],event,fn,a,data);
				if(this.e[i].addEventListener) this.e[i].addEventListener(event, a, false); 
				else if(this.e[i].attachEvent) this.e[i].attachEvent(event, a);
			}
		}
		return this;
	}
	stuQuery.prototype.trigger = function(e){
		var event; // The custom event that will be created

		if(document.createEvent) {
			event = document.createEvent("HTMLEvents");
			event.initEvent(e, true, true);
		}else{
			event = document.createEventObject();
			event.eventType = e;
		}

		event.eventName = e;

		for(var i = 0 ;  i < this.e.length ; i++){
			if(document.createEvent) this.e[i].dispatchEvent(event);
			else this.e[i].fireEvent("on" + event.eventType, event);
		}

		return this;
	}
	// If there is only one element, we trigger the focus event
	stuQuery.prototype.focus = function(){
		if(this.e.length == 1) this.e[0].focus();
		return this;
	}
	// If there is only one element, we trigger the blur event
	stuQuery.prototype.blur = function(){
		if(this.e.length == 1) this.e[0].blur();
		return this;
	}
	// Remove DOM elements
	stuQuery.prototype.remove = function(){
		if(!this.e) return this;
		for(var i = this.e.length-1; i >= 0; i--){
			if(!this.e[i]) return;
			if(typeof this.e[i].remove==="function") this.e[i].remove();
			else if(typeof this.e[i].parentElement.removeChild==="function") this.e[i].parentElement.removeChild(this.e[i]);
		}
		return E(this.e);
	}
	// Check if a DOM element has the specified class
	stuQuery.prototype.hasClass = function(cls){
		var result = true;
		for(var i = 0; i < this.e.length; i++){
			if(!this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) result = false;
		}
		return result;
	}
	// Toggle a class on a DOM element
	stuQuery.prototype.toggleClass = function(cls){
		// Remove/add it
		for(var i = 0; i < this.e.length; i++){
			if(this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this.e[i].className = this.e[i].className.replace(new RegExp("(\\s|^)" + cls + "(\\s|$)", "g")," ").replace(/ $/,'');
			else this.e[i].className = (this.e[i].className+' '+cls).replace(/^ /,'');
		}
		return E(this.e);
	}
	// Toggle a class on a DOM element
	stuQuery.prototype.addClass = function(cls){
		// Remove/add it
		for(var i = 0; i < this.e.length; i++){
			if(!this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this.e[i].className = (this.e[i].className+' '+cls).replace(/^ /,'');
		}
		return E(this.e);
	}
	// Remove a class on a DOM element
	stuQuery.prototype.removeClass = function(cls){
		// Remove/add it
		for(var i = 0; i < this.e.length; i++){
			while(this.e[i].className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)"))) this.e[i].className = this.e[i].className.replace(new RegExp("(\\s|^)" + cls + "(\\s|$)", "g")," ").replace(/ $/,'').replace(/^ /,'');
		}
		return E(this.e);
	}
	stuQuery.prototype.css = function(css){
		for(var i = 0; i < this.e.length; i++){
			// Read the currently set style
			var styles = {};
			var style = this.e[i].getAttribute('style');
			if(style){
				var bits = this.e[i].getAttribute('style').split(";");
				for(var b = 0; b < bits.length; b++){
					var pairs = bits[b].split(":");
					if(pairs.length==2) styles[pairs[0]] = pairs[1];
				}
			}
			// Add the user-provided style to what was there
			for(key in css) styles[key] = css[key];
			// Build the CSS string
			var newstyle = '';
			for(key in styles){
				if(newstyle) newstyle += ';';
				if(styles[key]) newstyle += key+':'+styles[key];
			}
			// Update style
			this.e[i].setAttribute('style',newstyle);
		}
		return E(this.e);
	}
	stuQuery.prototype.parent = function(){
		var tmp = [];
		for(var i = 0; i < this.e.length; i++) tmp.push(this.e[i].parentElement);
		return E(tmp);
	}
	// Only look one level down
	stuQuery.prototype.children = function(c){
		if(typeof c==="string"){
			// We are using a selector
			var result = [];
			for(var i = 0; i < this.e.length; i++){
				for(var ch = 0; ch < this.e[i].children.length; ch++){
					if(matchSelector(this.e[i].children[ch],c)) result.push(this.e[i].children[ch]);
				}
			}
			return E(result);
		}else{
			// We are using an index
			for(var i = 0; i < this.e.length; i++) this.e[i] = (this.e[i].children.length > c ? this.e[i].children[c] : this.e[i]);
			return E(this.e);
		}
	}
	stuQuery.prototype.find = function(selector){
		var tmp = [];
		var result = [];
		for(var i = 0; i < this.e.length; i++){
			tmp = getBy(this.e[i],selector);
			for(k = 0; k < tmp.length; k++){ result.push(tmp[k]); }
		}
		// Return a new instance of stuQuery
		return E(result);
	}
	stuQuery.prototype.attr = function(attr,val){
		var tmp = [];
		for(var i = 0; i < this.e.length; i++){
			tmp.push(this.e[i].getAttribute(attr));
			if(typeof val==="string" || typeof val==="number") this.e[i].setAttribute(attr,val)
		}
		if(tmp.length==1) tmp = tmp[0];
		if(typeof val==="undefined") return tmp;
		else return E(this.e);
	}
	stuQuery.prototype.prop = function(attr,val){
		var tmp = [];
		for(var i = 0; i < this.e.length; i++){
			tmp.push(this.e[i].getAttribute(attr));
			if(typeof val==="boolean"){
				if(val) this.e[i].setAttribute(attr,attr);
				else this.e[i].removeAttribute(attr);
			}
		}
		if(tmp.length==1) tmp = tmp[0];
		return tmp;
	}
	stuQuery.prototype.clone = function(){
		var span = document.createElement('div');
		span.appendChild(this.e[0].cloneNode(true));
		return span.innerHTML;
	}
	stuQuery.prototype.replaceWith = function(html){
		var span = document.createElement("span");
		span.innerHTML = html;
		var clone = E(this.e);
		for(var i = 0; i < this.e.length; i++) clone.e[0].parentNode.replaceChild(span, clone.e[0]);
  		return clone;
	}
	stuQuery.prototype.loadFile = function(file,fn,attrs){
		if(!attrs) attrs = {};
		attrs['_file'] = file;

		var httpRequest = new XMLHttpRequest();
		function error(err){
			console.log(err);
			if(typeof attrs.error==="function") attrs.error.call((attrs['this'] ? attrs['this'] : this),"",attrs);
		}
		httpRequest.onreadystatechange = function() {
			if(httpRequest.readyState === 4) {
				if(httpRequest.status === 200) {
					var data = (attrs['json']) ? JSON.parse(httpRequest.responseText) : httpRequest.responseText;
					if(typeof fn==="function") fn.call((attrs['this'] ? attrs['this'] : this),data,attrs);
				}else{
					error('Error reading '+file)
				}
			}
		};
		try{ httpRequest.open('GET', file); }
		catch(err){ error('Failed to open '+file); }

		try{ httpRequest.send(); }
		catch(err){ error('Failed to send request for '+file); }
		
		return this;	
	}
	stuQuery.prototype.loadJSON = function(file,fn,attrs){
		if(!attrs) attrs = {};
		attrs['json'] = true;
		this.loadFile(file,fn,attrs);
		return this;
	}
	return new stuQuery(e);
}
