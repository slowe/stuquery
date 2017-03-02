(function(){

	var G = {};
	if(typeof Object.extend === 'undefined'){
		G.extend = function(destination, source) {
			for(var property in source) {
				if(source.hasOwnProperty(property)) destination[property] = source[property];
			}
			return destination;
		};
	}else G.extend = Object.extend;

	function BarChart(target,attr){

		var ver = "0.3";
		this.target = target;
		if(S(this.target).length == 0) return {};
		this.attr = attr || {};
		this.bins = [];
		this.events = {resize:""};
		this.attr.units = (typeof this.attr.units==="undefined") ? "" : this.attr.units;
		this.attr.formatKey = (typeof this.attr.formatKey==="undefined") ? function(key){ return key; } : this.attr.formatKey;
		this.parent = (typeof this.attr.parent==="undefined") ? this : this.attr.parent;
	
		//if(typeof this.attr.max==="undefined") this.attr.max = this;
		this.max = this.attr.max;
		this.min = this.attr.min;
		this.inc = this.attr.inc;
		this.mintick = this.attr.mintick || 3;
		var _obj = this;
		this.bin = (typeof this.attr.bin==="function") ? function(v){ return this.attr.bin(v); } : function(v){ return Math.floor((v - this.min)/this.inc); };
		this.version = function(){ return ver; }	
		return this;
	}

	BarChart.prototype.isSelected = function(v){
		b = this.bin(v);
		return (typeof this.bins[b].selected==="boolean") ? this.bins[b].selected : true;
	}

	BarChart.prototype.select = function(r){
		for(var b = 0; b < this.bins.length; b++){
			if(r=="all") this.bins[b].selected = true;
			else this.bins[b].selected = false;
			if(this.bins[b].selected) S('#'+this.bins[b].id).removeClass('deselected');
			else S('#'+this.bins[b].id).addClass('deselected');
		}
		return this;
	}
	BarChart.prototype.toggleBin = function(b){
		key = this.bins[b].key;
		this.bins[b].selected = !this.bins[b].selected;
		S('#'+this.bins[b].id+'').toggleClass('deselected');
		return this;
	}
	
	BarChart.prototype.setBins = function(data,attr){
		if(!attr) attr = {};
		if(data && typeof data.length==="number") this.data = data;
		else{
			if(data) attr = data;
		}
		var typ = (this.data.length > 0 && typeof this.data[0][0]==="string") ? "string" : "number";
		if(!this.bins) this.bins = [];
		if(!attr.inc) attr.inc = this.inc;
		if(!attr.max) attr.max = this.max;
		if(!attr.min) attr.min = this.min;
		if(!attr.mintick) attr.mintick = this.mintick;
		if(typ==="string"){
			var f = 0;
			var fields = {};
			// Create empty bins
			for(var r = 0; r < this.data.length; r++){
				if(!fields[this.data[r][0]]){
					fields[this.data[r][0]] = f;
					f++;
				}
				b = fields[this.data[r][0]];
				if(!this.bins[b]) this.bins[b] = {'selected':true};
				this.bins[b].value = 0;
				if(this.bins[b].key != this.data[r][0]){
					this.bins[b].key = this.data[r][0];
					this.drawn = false;
				}
			}
			f = 0;
			// Populate bins
			for(var r = 0; r < this.data.length; r++){
				if(!fields[this.data[r][0]]){
					fields[this.data[r][0]] = f;
					f++;
				}
				b = fields[this.data[r][0]];
				this.bins[b].value += this.data[r][1];
			}
		}else{
			// Find range of data
			var s = 1e100;
			var e = -1e100;
			var binning = {};
			for(var o = 0; o < this.data.length; o++){
				if(this.data[o][0] < s) s = this.data[o][0];
				if(this.data[o][0] > e) e = this.data[o][0];
			}
			// Get binning of data
			if(attr.inc){
				binning.max = (attr.max) ? attr.max : e;
				binning.min = (attr.min) ? attr.min : s;
				binning.inc = attr.inc;
				this.drawn = false;
			}else{
				binning = this.getGrid(s,e,attr.mintick);
			}
			binning.range = binning.max - binning.min;
			binning.bins = Math.ceil(binning.range/binning.inc)+1;
			if(binning.max != this.max || binning.min != this.min || binning.inc != this.inc) this.drawn = false;
			if(this.inc && binning.inc != this.inc) this.drawn = false;
			if(!this.drawn) this.bins = [];

			// Set main value		
			this.max = binning.max;
			this.min = binning.min;
			this.inc = binning.inc;

			// Empty the bins
			for(var b = 0 ; b < binning.bins ; b++){
				if(!this.bins[b]) this.bins[b] = {'selected':true};
				this.bins[b].value = 0;
				this.bins[b].key = ''+(binning.min + b*binning.inc);
			}

			// Populate bins
			for(var r = 0; r < this.data.length; r++){
				b = this.bin(this.data[r][0]);
				this.bins[b].value += this.data[r][1];
			}
		}
		return this;
	}

	BarChart.prototype.draw = function(){

		var id = this.target.substr(1);
		if(!this.target || !this.bins) return this;

		var mx = 0;
		var nbins = this.bins.length;
	
		if(nbins > 0){

			if(S(this.target+' .label').length == 0) S(this.target).append('<span class="label">label</span>');
			if(!this.lineheight) this.lineheight = S(this.target).find('.label')[0].offsetHeight;
			// Set the height of the graph
			if(!this.height) this.height = S(this.target)[0].offsetHeight || 200;
			h = this.height-this.lineheight;

			// Find the peak value
			for(var b = 0; b < this.bins.length; b++){
				if(this.bins[b].value > mx) mx = this.bins[b].value;
			}

			if(typeof this.drawn==="undefined") this.drawn = false;

			// Build the basic graph structure
			if(!this.drawn) S(this.target).addClass('barchart').html('<div class="grid" style="height:'+(h)+'px;"></div><table style="height:'+this.height+'px"><tr style="vertical-align:bottom;"></tr></table><div style="clear:both;"></div>');

			// Draw the grid
			var grid = this.getGrid(0,mx);
			var output = "";
			for(var g = 0; g <= grid.max; g+= grid.inc) output += '<div class="line" style="bottom:'+(h*g/mx)+'px;"><span>'+(this.attr.units || "")+this.formatNumber(g)+'</span></div>';
			S(this.target+' .grid').html(output);

			var maketable = (S(this.target+' table td').length == 0);
			output = "";
	
			for(var b = 0; b < this.bins.length; b++){
				var key = this.bins[b].key;
				var hbar = (mx > 0 ? (h*this.bins[b].value/mx).toFixed(1) : 0);
				var ha = Math.round(h-hbar);
				var hb = h-ha;
				if(hb < 1){
					ha--;
				}

				var idbar = id+'-bar-'+key.replace(/ /g,'-');
				this.bins[b].id = idbar;
				if(maketable) output += '<td id="'+idbar+'" style="width:'+(100/nbins).toFixed(3)+'%;" class="'+(!this.bins[b].selected ? ' deselected' : '')+'" data-index="'+b+'"><div class="antibar" style="height:'+ha+'px;"></div><div class="bar" title="'+key+': '+(this.attr.units || "")+this.formatNumber(this.bins[b].value)+'" style="height:'+hb+'px;"></div>'+(((typeof key==="string" && key.indexOf('-01')) || key.indexOf('-')==-1) ? '<span class="label">'+this.attr.formatKey.call(this,key)+'</span>' : '')+'</td>';
				else{
					var p = S('#'+idbar+'');
					p.attr('class',''+(!this.bins[b].selected ? 'deselected' : ''))
					p.find('.bar').css({'height':hb+'px'}).attr('title',key+': '+(this.attr.units || "")+this.formatNumber(this.bins[b].value));
					p.find('.antibar').css({'height':ha+'px'});
					p.find('.label').html(this.attr.formatKey.call(this,key))
				}
			}

			if(maketable){
				// Add the table cells
				S(this.target+' table tr').html(output);
				S(this.target).on('mouseleave',{me:this},function(e){ e.data.me.trigger("mouseleave",{event:e}); })
				S(this.target).on('mouseover',{me:this},function(e){ e.data.me.trigger("mouseover",{event:e}); })
			}
			// Attach the events
			if(!this.drawn){
				S(this.target+' .bar').parent()
					.on('click',{me:this,parent:this.attr.parent},function(e){ e.data.me.trigger("barclick",{event:e}); })
					.on('mouseover',{me:this,parent:this.attr.parent},function(e){ e.data.me.trigger("barover",{event:e}); });
			}
			this.drawn = true;
		}
	
		return this;

	}
	
	// Attach a handler to an event for the Graph object in a style similar to that used by jQuery
	//   .on(eventType[,eventData],handler(eventObject));
	//   .on("resize",function(e){ console.log(e); });
	//   .on("resize",{me:this},function(e){ console.log(e.data.me); });
	BarChart.prototype.on = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(typeof fn=="undefined"){ fn = e; e = {}; }
		else{ e = {data:e} }
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];

		return this;
	}
	BarChart.prototype.off = function(ev){
		if(typeof ev != "string") return this;
		if(typeof this.events[ev]=="object") this.events[ev] = [];
		return this;
	}

	// Trigger a defined event with arguments. This is for internal-use to be 
	// sure to include the correct arguments for a particular event
	BarChart.prototype.trigger = function(ev,args){
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

	BarChart.prototype.getGrid = function(mn,mx,mintick){
		var rg = mx-mn;
		var base = 10;
		if(!mintick) mintick = 3;
		var t_inc = Math.pow(base,Math.floor(Math.log(rg)/Math.log(base)));
		t_inc *= 2;
		var t_max = (Math.floor(mx/t_inc))*t_inc;
		if(t_max < mx) t_max += t_inc;
		var t_min = t_max;
		var i = 0;
		do {
			i++;
			t_min -= t_inc;
		}while(t_min > mn);

		// Test for really tiny values that might mess up the calculation
		if(Math.abs(t_min) < 1E-15) t_min = 0.0;

		// Add more tick marks if we only have a few
		while(i < mintick) {
			t_inc /= 2.0;
			if((t_min + t_inc) <= mn) t_min += t_inc;
			if((t_max - t_inc) >= mx) t_max -= t_inc ;
			i = i*2;
		}
		// We don't want an empty bin at the top end of the range
		if(t_max > mx) t_max -= t_inc;
		return {'min':t_min,'max':t_max,'inc':t_inc,'range':t_max-t_min};
	}
	
	BarChart.prototype.formatNumber = function(v){
		if(typeof v !== "number") return v;
		if(v >= 1e7) return Math.round(v/1e6)+"M";
		if(v >= 1e6) return (v/1e6).toFixed(1)+"M";
		if(v >= 1e5) return Math.round(v/1e3)+"k";
		if(v >= 1e4) return Math.round(v/1e3)+"k";
		// Remove rounding issues
		return (''+v).replace(/0{5,}1$/,"");
	}

	S.barchart = function(target,bins,attr){ return new BarChart(target,bins,attr); }

})(S);