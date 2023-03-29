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

	// Polyfill
	if (Element.prototype.getAttributeNames == undefined) {
		Element.prototype.getAttributeNames = function () {
			var attributes = this.attributes;
			var length = attributes.length;
			var result = new Array(length);
			for (var i = 0; i < length; i++) result[i] = attributes[i].name;
			
			return result;
		};
	}

	// Main function
	function HexMap(el,attr){
	
		this.version = "0.3.4";
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
		this.attr = attr;
		
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

		// odd-r  shoves odd rows by +½ column
		// even-r  shoves even rows by +½ column
		// odd-q  shoves odd columns by +½ row
		// even-q  shoves even columns by +½ row
		this.setLayout(this.container.attr('data-layout'))
		
		this.lookup = {};

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

			if(json.layout) this.setLayout(json.layout);

			var html = '<div class="hexmap '+this.type+'" data-layout="'+this.layout+'"><div class="hexmapinner">';
			var i = 0;
			for(var id in json.hexes){
				html += '<'+this.tag+' class="hex" tabindex="0" data-id="'+id+'" data-r="'+json.hexes[id].r+'" data-q="'+json.hexes[id].q+'"><div class="hexinner"><div class="hexcontent">'+(typeof this.options.formatLabel==="function" ? this.options.formatLabel(id,json.hexes[id]) : '')+'</div></div></'+this.tag+'>';
				this.hexes[i] = new Hex(json.hexes[id],{'parent':this,'id':id});
				this.lookup[id] = i;
				i++;
			}
			html += '</div></div>'

			code[0].outerHTML = html;
		}else{
			// Get the hexes
			hexes = this.container.find('.hex');

			// Work out layout
			this.setLayout(this.container.find('.hexmap').attr('data-layout'));

			json = {'layout':this.layout,'hexes':{}};

			// Get the data from the hexes
			for(var i = 0; i < hexes.length; i++){
				hex = S(hexes[i]);
				id = hex.attr('data-id');
				hattr = hex[0].getAttributeNames();
				if(id){
					json.hexes[id] = {'n':(hex.attr('title') || "")};
					for(var a = 0; a < hattr.length; a++){
						if(hattr[a].indexOf('data-')==0){
							key = hattr[a].substr(5);
							json.hexes[id][key] = hex.attr(hattr[a]);
							if(json.hexes[id][key].indexOf(/[^0-9]/) < 0){
								json.hexes[id][key] = parseInt(json.hexes[id][key]);
							}
						}
					}
					this.hexes[i] = new Hex(json.hexes[id],{'parent':this,'id':id});
					this.lookup[id] = i;
				}
			}
			this.json = json;
		}

		var _obj = this;
		// We'll need to change the sizes when the window changes size
		window.addEventListener('resize',function(e){ _obj.resize(); });
		

		this.getLeft = function(r,q){
			var dx = this.hex.wide*0.5;
			var x = (q - this.q.min)*this.hex.wide;
			if(this.type=="pointy"){
				if(this.shift=="even"){
					if(Math.abs(r)%2) x += 0;
					else x += dx;
				}else if(this.shift="odd"){
					if(Math.abs(r)%2) x += dx;
				}
			}else if(this.type=="flat"){
				x *= 0.75;
			}
			return x;
		}
		this.getBottom = function(r,q){
			var dy = this.hex.tall*0.5;
			var y = (r - this.r.min)*this.hex.tall;
//if(this.container.attr('id')=="hexmap-9") console.log(this.container,r,this.r.min,y,q,Math.abs(q)%2,this.shift)
			if(this.type=="pointy"){
				y *= 0.75;
			}else if(this.type=="flat"){
				if(this.shift=="even"){
					if(Math.abs(q)%2==1) y += dy;
					else y += 0;
				}else if(this.shift="odd"){
					if(Math.abs(q)%2==1) y -= dy;
					else y += 0;
				}
			}
			return y;
		}

		if(attr.file) this.load(attr.file);
		else this.init();

		return this;
	}

	HexMap.prototype.setLayout = function(layout){
		if(layout!="odd-r" && layout!="odd-q" && layout!="even-r" && layout!="even-q") layout = "odd-r";
		// odd-r  shoves odd rows by +½ column
		// even-r  shoves even rows by +½ column
		// odd-q  shoves odd columns by +½ row
		// even-q  shoves even columns by +½ row
		this.layout = layout;
		this.type = (this.layout.indexOf('q')>0 ? 'flat':'pointy');
		var otype = (this.layout.indexOf('r')>0 ? 'flat':'pointy');
		this.shift = (this.layout.indexOf('odd')==0 ? 'odd':'even');
		this.container.find('.hexmap').removeClass(otype).addClass(this.type);
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
		for(var i = 0; i < hexes.length; i++){

			this.hexes[i] = new Hex(this.hexes[i],{'el':hexes[i],'parent':this,'width':this.attr.width});
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
		if(this.shift=='odd' && Math.abs(this.r.min)%2==0){
			this.qoffset = [0.5,0];
		}

		this.hex = {'wide': this.hexes[0].el[0].clientWidth,'tall':this.hexes[0].el[0].clientHeight};

		// We want sizes to be integer multiples of 4 to avoid CSS leaving gaps
		if(this.hex.wide%4!=0) this.hex.wide = Math.round(this.hex.wide/4)*4;
		if(this.hex.tall%4!=0) this.hex.tall = Math.round(this.hex.tall/4)*4;

		for(var i = 0; i < hexes.length; i++){
			if(this.shift=='odd'){
				tq = this.hexes[i].q + (this.hexes[i].q % 2==1) ? 0 : -0.5;
			}
			if(tq < minq) minq =  tq;
			if(tq > maxq) maxq =  tq;
		}

		if(this.type=="flat"){
			this.wide = ((maxq-minq+1)*0.75 + 0.25)*this.hex.wide;
			this.tall = ((maxr-minr) + 1)*this.hex.tall;
console.log(this.wide,this.wide/this.hex.wide,maxq,minq,this.hex.wide)
		}else{
			this.wide = (maxq-minq + 1)*this.hex.wide;
			this.tall = (maxr-minr + 1)*this.hex.tall*0.75 + this.hex.tall*0.25;
		}
		
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
				this.hexes[i].setColour(out);
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
				id = this.hexes[i].el.attr('data-id');
				this.hexes[i].setContent(this.options.formatLabel(id,this.hexes[i]));
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
				id = this.hexes[i].el.attr('data-id')
				c = cls.call(this,id,this.hexes[i]);
				this.hexes[i].setClass(c);
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
		this.container.find('.hexmapinner').css({'transform':'scale('+this.zoom.toFixed(4)+')'});
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
		for(var i = 0; i < this.hexes.length; i++) this.hexes[i].position(this.getLeft(this.hexes[i].r,this.hexes[i].q),this.getBottom(this.hexes[i].r,this.hexes[i].q),this.hex.wide,this.hex.tall);
		return this;
	}

	// An object for each hex
	function Hex(me,attr){
		for(var a in me) this[a] = me[a];
		if(attr.el) this.el = S(attr.el);
		if(attr.r) this.r = parseInt(this.el.attr('data-r'));
		if(attr.q) this.q = parseInt(this.el.attr('data-q'));
		if(attr.n) this.n = this.el.find('.default').html();
		if(attr.id) this.id = attr.id;
		this.s = -this.q - this.r;

		if(typeof attr.width==="number") this.el.css({'width':attr.width+'em','height':(attr.width*7.125/6)+'em'});

		this.setColour = function(css){ this.el.find('.hexinner').css(css); };
		this.setContent = function(html){ this.el.find('.hexcontent').html(html); };
		this.setClass = function(c){
			var inner = this.el.find('.hexinner');
			inner.attr('class','').addClass('hexinner');
			if(c) inner.addClass(c);
		};

		return this;
	}
	
	Hex.prototype.position = function(x,y,w,h){
		this.el.css({
			'left':x+'px',
			'bottom':y+'px',
			'width':w+'px',
			'height':h+'px'
		});
		return this;
	}

	/*
	Hex.prototype.corner = function(i){
		var angle_deg = 60 * i   + 30
		var angle_rad = PI / 180 * angle_deg
		return Point(center.x + size * cos(angle_rad),
					 center.y + size * sin(angle_rad))
	}
	*/
                 

	function axial2cube(q,r){ return [q,r,-q-r]; }
	function cube2axial(q,r,s){ return [q,r]; }

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
