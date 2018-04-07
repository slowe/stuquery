/*

	Interactive Hex Maps

	Requires stuquery
*/
(function(){

	// Extend objects
	var G = {};
	if(typeof Object.extend === 'undefined'){
		G.extend = function(destination, source) {
			for(var property in source) {
				if(source.hasOwnProperty(property)) destination[property] = source[property];
			}
			return destination;
		};
	}else G.extend = Object.extend;


	// Main function
	function HexMap(el,attr){
	
		this.version = "0.3";
		this.idprefix = "hex-";
		this.events = {resize:""};
		this.zoom = 1;
		this.hexes = new Array();
		this.logging = true;
		this.tag = "div";

		if(!attr) attr  = {};
		this.options = {
			'showlabel':(typeof attr.showlabel==="boolean" ? attr.showlabel : true),
			'formatLabel': (typeof attr.formatLabel==="function" ? attr.formatLabel : "")
		};
		
		// We are dealing with a CSS ID
		if(typeof el==="string"){
			id = el;
			this.container = S('#'+id);
			el = this.container[0];
		}else{
			return this;
		}
		this.tag = el.tagName.toLowerCase();
		
		if(this.container.length!=1){
			console.log("Can't find a unique element to draw into (#"+id+")");
			return {};
		}

		this.layout = this.container.attr('data-layout') || "odd-r";

		// If we have HexJSON inside a <code> element we turn it into SVG
		if(this.tag != "code" && this.container.find('code').length==1){

			// We've embedded some HexJSON
			var code = this.container.find('code');
			var json = JSON.parse(code.html());
			this.json = json;
			// Zap the code immediately
			code.html('');
			var parent = code.parent();
			var children = code.parent()[0].childNodes;
			var match = 0;
			for(var c = 0; c < children.length; c++){
				if(children[c] == code) match = c;
			}

			if(json.layout) this.layout = json.layout;

			var html = '<div class="hexmap" data-layout="'+json.layout+'"><div class="hexmapinner">';
			this.lookup = {};
			var i = 0;
			for(var id in json.hexes){
				html += '<'+this.tag+' class="hex" tabindex="0" id="'+id+'" data-r="'+json.hexes[id].r+'" data-q="'+json.hexes[id].q+'"><div class="hexinner"><div class="hexcontent">'+(typeof this.options.formatLabel==="function" ? this.options.formatLabel(id,json.hexes[id]) : '')+'</div></div></'+this.tag+'>';
				this.hexes[i] = new Hex(json.hexes[id],{'parent':this});
				this.lookup[id] = i;
				i++;
			}

			code[0].outerHTML = html;
		}

		var _obj = this;
		// We'll need to change the sizes when the window changes size
		window.addEventListener('resize',function(e){ _obj.resize(); });
		

		this.getLeft = function(r,q){
			return ((q - this.q.min + (Math.abs(r)%2==(this.layout.indexOf('odd')==0 ? 1 : 0) ? this.qoffset[0] : this.qoffset[1]))*this.hex.wide);
		}
		this.getBottom = function(r,q){
			return ((r - this.r.min)*this.hex.tall*0.75);
		}

		if(attr.file) this.load(attr.file);
		else this.init();

		return this;
	}

	// Can load a file or a hexjson data structure
	HexMap.prototype.load = function(file,attr,fn){
	/*
		if(typeof attr==="function" && !fn){
			fn = attr;
			attr = "";
		}
		if(typeof fn !== "function") return this;

		if(typeof file==="string"){
			S(document).ajax(file,{
				'complete': function(data){
					this.setMapping(data);
					if(typeof fn==="function") fn.call(this,{'data':attr});
				},
				'error': this.failLoad,
				'this': this,
				'dataType':'json'
			});
		}else if(typeof file==="object"){
			this.setMapping(file);
			if(typeof fn==="function") fn.call(this,{'data':attr});
		}
		*/
		return this;
	}

	HexMap.prototype.init = function(){

		var minr = 1e12;
		var minq = 1e12;
		var maxr = -1e12;
		var maxq = -1e12;
		var hexes = this.container.find('.hex');
		//this.hexes = new Array(hexes.length);
		for(var i = 0; i < hexes.length; i++){

			this.hexes[i] = new Hex(this.hexes[i],{'el':hexes[i],'parent':this});

			if(this.hexes[i].r > maxr) maxr = this.hexes[i].r;
			if(this.hexes[i].r < minr) minr = this.hexes[i].r;
			if(this.hexes[i].q > maxq) maxq = this.hexes[i].q;
			if(this.hexes[i].q < minq) minq = this.hexes[i].q;
			this.hexes[i].el.on('focus',{me:this,i:i},function(e){
				e.data.me.trigger("focus",{event:e,i:e.data.i,hex:e.data.me.hexes[e.data.i]});
			}).on('blur',{me:this,i:i},function(e){
				e.data.me.trigger("blur",{event:e,i:e.data.i,hex:e.data.me.hexes[e.data.i]});
			}).on('click',{me:this,i:i},function(e){
				e.data.me.trigger("click",{event:e,i:e.data.i,hex:e.data.me.hexes[e.data.i]});
			}).on('mouseover',{me:this,i:i},function(e){
				e.data.me.trigger("mouseover",{event:e,i:e.data.i,hex:e.data.me.hexes[e.data.i]});
			}).on('mouseout',{me:this,i:i},function(e){
				e.data.me.trigger("mouseout",{event:e,i:e.data.i,hex:e.data.me.hexes[e.data.i]});
			})
		}
		this.r = {'min':minr,'max':maxr};
		this.q = {'min':minq,'max':maxq};

		this.qoffset = [0,-0.5];
		if(this.layout.indexOf('odd')==0 && Math.abs(this.r.min)%2==0){
			this.qoffset = [0.5,0];
		}

		this.hex = {'wide':this.hexes[0].el[0].clientWidth,'tall':this.hexes[0].el[0].clientHeight};

		for(var i = 0; i < hexes.length; i++){
			if(this.layout.indexOf('odd')==0){
				tq = this.hexes[i].q + (this.hexes[i].q % 2==1) ? 0 : -0.5;
			}
			if(tq < minq) minq =  tq;
			if(tq > maxq) maxq =  tq;
		}

		this.wide = (maxq-minq + 1)*this.hex.wide;// + paddingWidth(this.container[0]);//marginWidth(this.container.find('.hexgrid')[0]);
		this.tall = (maxr-minr + 1)*this.hex.tall*0.75 + this.hex.tall*0.25;// + paddingHeight(this.container[0]); // + marginHeight(this.container.find('.hexgrid')[0]);
		
		this.container.css({'width':this.wide+'px','height':this.tall.toFixed(1)+'px'}).find('.hexmap').css({'width':this.wide+'px','height':this.tall.toFixed(1)+'px'});
		return this;
	}

	// Set the zoom level for the hex grid view (default is 1)
	HexMap.prototype.setZoom = function(z){
		this.zoom = (z||1);
		this.resize();
		return this;
	}

	/*
		Set the colours (background and foreground) of every hex tile 
		
		Inputs:
		function  - a callback that is given the HexMap as the this context 
		            and one parameter which is a specific hex. It should return
		            an object e.g. {'background-color':'blue','color':'#efefef'}
		start     - the first hex in a range to be coloured (defaults to first hex)
		end       - the last hex in a range to be coloured (defaults to last hex)
	*/
	HexMap.prototype.setColour = function(colourise,start,end){
		if(!start){ start = 0; }
		if(!end){ end = this.hexes.length-1; }
		
		if(typeof colourise==="function"){
			var out;
			for(var i = start; i <= end; i++){
				out = colourise.call(this,this.hexes[i],{});
				c = out['background-color'];
				t = out['color'];
				this.hexes[i].el.find('.hexinner').css({'background-color':c,'color':t});
			}
		}
		return this;
	}
	
	
	/*
		Set the content of every hex tile 
		
		Inputs:
		function  - a callback that is given the HexMap as the this context 
		            and one parameter which is a specific hex. It should return
		            a string of the new content to put in the hex
		start     - the first hex in a range to be coloured (defaults to first hex)
		end       - the last hex in a range to be coloured (defaults to last hex)
	*/
	HexMap.prototype.setContent = function(formatLabel,start,end){
		if(!start){ start = 0; }
		if(!end){ end = this.hexes.length-1; }
		
		if(typeof formatLabel==="function"){
			this.options.formatLabel = formatLabel;

			var out;
			for(var i = start; i <= end; i++){
				id = this.hexes[i].el.attr('id')
				this.hexes[i].el.find('.hexcontent').html(this.options.formatLabel(id,this.json.hexes[id]));
			}
		}
		return this;
	}
	
	/*
		Set the class of every hex tile 
		
		Inputs:
		function  - a callback that is given the HexMap as the this context 
		            and one parameter which is a specific hex. It should return
		            a string for the class(es) to be attached
		start     - the first hex in a range to be coloured (defaults to first hex)
		end       - the last hex in a range to be coloured (defaults to last hex)
	*/
	HexMap.prototype.setClass = function(cls,start,end){
		if(!start){ start = 0; }
		if(!end){ end = this.hexes.length-1; }
		
		if(typeof cls==="function"){
			var c;
			for(var i = start; i <= end; i++){
				id = this.hexes[i].el.attr('id')
				c = cls.call(this,id,this.hexes[i]);
				this.hexes[i].el.find('.hexinner').attr('class','').addClass('hexinner'+(c ? ' '+c:''));
			}
		}
		return this;
	}
	
	// Function to resize our hex grid based on the DOM container
	HexMap.prototype.resize = function(){
		this.container.css({'width':'','height':''})
		var parent = this.container.parent();
		var padding = paddingWidth(this.container[0]);
		if(this.container[0].offsetWidth < this.wide + padding){
			w = this.container[0].offsetWidth - padding;
			scale = Math.min(1,w/this.wide);
			this.container.find('.hexmap').css({'height':(this.tall*scale).toFixed(1)+'px','transform':'scale('+(scale).toFixed(4)+')','transform-origin':'bottom left'});
		}else{
			this.container.css({'width':this.wide+'px','height':this.tall+'px'}).find('.hexmap').css({'width':this.wide+'px','height':this.tall+'px','transform':'scale(1)'});
		}
		this.container.find('.hexmapinner').css({'transform':'scale('+this.zoom.toFixed(4)+')','transform-origin':'bottom left','width':'100%','height':'100%'})
		return this;
	}

	// Attach a handler to an event for the Graph object in a style similar to that used by jQuery
	//   .on(eventType[,eventData],handler(eventObject));
	//   .on("resize",function(e){ console.log(e); });
	//   .on("resize",{me:this},function(e){ console.log(e.data.me); });
	HexMap.prototype.on = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(typeof fn=="undefined"){ fn = e; e = {}; }
		else{ e = {data:e} }
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];

		return this;
	}

	// Remove a handler from an event
	HexMap.prototype.off = function(ev){
		if(typeof ev != "string") return this;
		if(typeof this.events[ev]=="object") this.events[ev] = [];
		return this;
	}

	// Trigger a defined event with arguments. This is for internal-use to be 
	// sure to include the correct arguments for a particular event
	HexMap.prototype.trigger = function(ev,args){
		if(typeof ev != "string") return;
		if(typeof args != "object") args = {};
		var o = [];
		if(typeof this.events[ev]=="object"){
			for(var i = 0 ; i < this.events[ev].length ; i++){
				var e = G.extend(this.events[ev][i].e,args);
				if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e))
			}
		}
		if(o.length > 0) return o;
	}

	// Position all the hexes
	HexMap.prototype.positionHexes = function(){
		var el;
		for(var i = 0; i < this.hexes.length; i++){
			el = this.hexes[i].el;
			el.css({
				'position':'absolute',
				'left':this.getLeft(this.hexes[i].r,this.hexes[i].q)+'px',
				'bottom':this.getBottom(this.hexes[i].r,this.hexes[i].q)+'px'
			});
		}		
		return this;
	}

	// An object for each hex
	function Hex(me,attr){
		for(var a in me) this[a] = me[a];
		if(attr.el) this.el = S(attr.el);
		if(attr.r) this.r = parseInt(this.el.attr('data-r'));
		if(attr.q) this.q = parseInt(this.el.attr('data-q'));
		if(attr.n) this.n = this.el.find('.default').html();

		return this;
	}
	
	// Helper functions
	function marginHeight(el) {
		var style = getComputedStyle(el);
		return parseInt(style.marginTop) + parseInt(style.marginBottom);
	}
	function marginWidth(el) {
		var style = getComputedStyle(el);
		return parseInt(style.marginLeft) + parseInt(style.marginRight);
	}
	function paddingHeight(el) {
		var style = getComputedStyle(el);
		return parseInt(style.paddingTop) + parseInt(style.paddingBottom);
	}
	function paddingWidth(el) {
		var style = getComputedStyle(el);
		return parseInt(style.paddingLeft) + parseInt(style.paddingRight);
	}

	// Make something publicly visible
	S.hexmap = function(id,attr){ return new HexMap(id,attr); }

})(S);
