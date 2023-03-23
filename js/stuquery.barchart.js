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

		var ver = "0.9.10";
		this.target = target;
		if(S(this.target).length == 0) return {};
		this.attr = attr || {};
		this.events = {resize:""};
		this.attr.units = (typeof this.attr.units==="undefined") ? "" : this.attr.units;
		this.attr.formatX = (typeof this.attr.formatX==="undefined") ? (typeof this.attr.formatKey==="function" ? this.attr.formatKey : function(key){ return key; }) : this.attr.formatX;
		this.attr.formatY = (typeof this.attr.formatY==="undefined") ? function(v){ return this.attr.units+v; } : this.attr.formatY;
		this.attr.formatBar = (typeof this.attr.formatBar==="undefined") ? function(key,val,series){ return ""; } : this.attr.formatBar;
		this.parent = (typeof this.attr.parent==="undefined") ? this : this.attr.parent;

		this.drawn = false;
		this.max = this.attr.max || undefined;
		this.min = this.attr.min || undefined;
		this.inc = this.attr.inc || undefined;
		this.mintick = this.attr.mintick || 3;
		this.bin = (typeof this.attr.bin==="function") ? this.attr.bin : function(v){ return (this.typ==="string" ? this.fields[v] : Math.floor((v - this.min)/this.inc)); };
		this.version = function(){ return ver; };
		return this;
	}

	BarChart.prototype.isSelected = function(v){
		b = this.bin(v);
		// If there is no value, use the first bin
		if(typeof v==="undefined") b = 0;
		if(b >= this.nbins) b = this.nbins-1;
		if(b < 0) b = 0;
		return (typeof this.bins[b].selected==="boolean") ? this.bins[b].selected : true;
	};

	BarChart.prototype.select = function(r){
		for(var b = 0; b < this.nbins; b++){
			if(r=="all") this.bins[b].selected = true;
			else this.bins[b].selected = false;
			if(this.bins[b].selected) S('#'+this.bins[b].id).removeClass('deselected');
			else S('#'+this.bins[b].id).addClass('deselected');
		}
		return this;
	};

	BarChart.prototype.toggleBin = function(b){
		this.bins[b].selected = !this.bins[b].selected;
		S('#'+this.bins[b].id+'').toggleClass('deselected');
		return this;
	};

	// A function to provide the data
	// Our assumption is that the bins will be the same as any previous data
	// If you need to update the scales, call setBins afterwards
	BarChart.prototype.setData = function(data){
		if(data && typeof data.length==="number") this.data = data;
		return this;
	};

	// A function to set/change any scaling
	BarChart.prototype.setBins = function(attr){
		if(!attr) attr = {};

		var calc = false;
		var b,r,s;

		var typ = (this.data.length > 0 && typeof this.data[0][0]==="string") ? "string" : "number";
		if(this.typ && typ!=this.typ) calc = true;
		if(attr.update) calc = true;
		// Update our record of the type of binning
		this.typ = typ;

		// If we haven't been provided a setting, use a previously set value
		if(typeof attr.inc==="undefined") attr.inc = this.inc;
		if(typeof attr.max==="undefined") attr.max = this.max;
		if(typeof attr.min==="undefined") attr.min = this.min;
		if(typeof attr.mintick==="undefined") attr.mintick = this.mintick;

		// See if anything has changed
		if(attr.inc!=this.inc) calc = true;
		if(attr.min!=this.min) calc = true;
		if(attr.max!=this.max) calc = true;

		// Do we have any settings missing at this point?
		if(this.typ=="number"){
			if(typeof attr.inc!=="number") calc = true;
			if(typeof attr.min!==typ) calc = true;
			if(typeof attr.max!==typ) calc = true;
			if(typeof attr.mintick!=="number") calc = true;
		}

		if(!this.bins) calc = true;

		if(typ==="string"){
			// We are in a category-based binning regime
			var f = 0;
			if(calc){
				this.fields = {};
				this.bins = {};
				// Create empty bins
				for(r = 0; r < this.data.length; r++){
					if(!this.fields[this.data[r][0]]){
						this.fields[this.data[r][0]] = f;
						f++;
					}
					b = this.fields[this.data[r][0]];
					if(!this.bins[b]) this.bins[b] = {'selected':true};
					if(this.bins[b].key != this.data[r][0]){
						this.bins[b].key = this.data[r][0];
						this.drawn = false;
					}
				}
				this.nbins = f;
			}
			// Empty bins
			for(b in this.bins){
				if(this.bins[b]){
					this.bins[b].value = 0;
					this.bins[b].values = [];
				}
			}
		}else{
			// We are in a number based binning regime
			if(calc){
				// Find range of data
				s = 1e100;
				var e = -1e100;
				var binning = {};
				for(var o = 0; o < this.data.length; o++){
					if(this.data[o][0] < s) s = this.data[o][0];
					if(this.data[o][0] > e) e = this.data[o][0];
				}
				// Get binning of data
				// If we've set properties we use them, unless we're forcing a recalculation
				if(attr.inc && !attr.update){
					binning.max = (typeof attr.max==="number") ? attr.max : e;
					binning.min = (typeof attr.min==="number") ? attr.min : s;
					binning.inc = attr.inc;
				}else{
					binning = this.getGrid(s,e,attr.mintick);
				}
				binning.range = binning.max - binning.min;
				binning.bins = Math.round(0.5 + binning.range/binning.inc);

				this.drawn = false;
				this.bins = [];

				// Set main value
				this.max = binning.max;
				this.min = binning.min;
				this.inc = binning.inc;
				this.range = binning.range;
				this.nbins = binning.bins;
			}
			if(typeof this.nbins!=="number") this.nbins = Math.ceil(this.range/this.inc);
			// Empty the bins
			for(b = 0 ; b < this.nbins ; b++){
				if(!this.bins[b]) this.bins[b] = {'selected':true};
				this.bins[b].value = 0;
				this.bins[b].values = [];
				this.bins[b].key = ''+(this.min + b*this.inc);
			}
		}
		if(attr.mintick) this.mintick = attr.mintick;
		// Populate bins
		for(r = 0; r < this.data.length; r++){
			b = this.bin(this.data[r][0]);
			if(typeof this.data[r][1]==="undefined"){
			}else{
				if(this.data[r][1].length > 1){
					for(s = 0; s < this.data[r][1].length; s++){
						// If no series bin has been defined, define it now
						if(typeof this.bins[b].values[s]!=="number") this.bins[b].values[s] = 0;
						this.bins[b].value += parseFloat(this.data[r][1][s]);
						this.bins[b].values[s] += parseFloat(this.data[r][1][s]);
					}
				}else{
					// If no series bin has been defined, define it now
					if(typeof this.bins[b].values[0]!=="number") this.bins[b].values[0] = 0;
					this.bins[b].value += parseFloat(this.data[r][1]);
					this.bins[b].values[0] += parseFloat(this.data[r][1]);
				}
			}
		}
		return this;
	};

	BarChart.prototype.getYRange = function(){
		var mx = 0;
		var mn = 0;
		// Find the peak value
		for(var b = 0; b < this.nbins; b++){
			if(this.bins[b].value > mx) mx = this.bins[b].value;
			var v = 0;
			for(var s = 0; s < this.bins[b].values.length; s++) v += (this.bins[b].values[s]);
			if(v < 0) mn = v;
		}
		return {'min':mn,'max':mx};
	};

	BarChart.prototype.draw = function(){

		var id = this.target.substr(1).replace(/^([^\s]+).*$/,function(m,p1){return p1;});
		if(!this.target || !this.bins) return this;

		var mx = 0;
		var mn = 0;
		var b,v,s;

		if(this.nbins > 0){
			S(this.target).addClass('barchart').css({'margin-bottom':'2.25em'});

			if(typeof this.lineheight!=="number"){
				S(this.target).append('<table class="remove"><tr><td><span class="label">label</span></td></tr></table>');
				styles = window.getComputedStyle(S(this.target).find('table .label')[0]);
				this.lineheight = parseInt(styles.lineHeight)+parseInt(styles.paddingBottom)+parseInt(styles.paddingTop);
				S(this.target).find('.remove').remove();
			}
			// Set the height of the graph
			if(!this.height) this.height = S(this.target)[0].offsetHeight || parseInt(S(this.target).css('height')) || 200;
			h = this.height-this.lineheight;

			mn = (this.attr.ymin) ? this.attr.ymin : 0;

			// Find the peak value
			for(b = 0; b < this.nbins; b++){
				if(this.bins[b].value > mx) mx = this.bins[b].value;
				v = 0;
				for(s = 0; s < this.bins[b].values.length; s++) v += (this.bins[b].values[s]);
				if(v < 0 && v < mn) mn = v;
			}

			// Build the basic graph structure
			if(!this.drawn) S(this.target).html('<div class="grid" style="height:100%;"></div><table style="height:100%"><tr style="vertical-align:bottom;"></tr></table><div style="clear:both;"></div>');

			// Draw the grid
			if(this.attr.ymax && this.attr.ymax > mx) mx = this.attr.ymax;
			var grid = this.getGrid(mn, mx);
			var output = "";
			var key,hbar,ha,hb,idbar, p;
			var r = mx-mn;
			h = 100;	// percent-based

			// Only draw lines within the mn-mx range
			for(var g = grid.min; g <= grid.max; g+= grid.inc){
				if(g >= mn && g <= mx){
					output += '<div class="line" style="bottom:'+(h*(g-mn)/r).toFixed(4)+'%;"><span>'+(typeof this.attr.formatY==="function" ? this.attr.formatY.call(this,g,{'units':this.attr.units}) : (this.attr.units || "")+this.formatNumber(g))+'</span></div>';
				}
			}
			S(this.target+' .grid').html(output);


			var maketable = (S(this.target+' table td').length == 0);
			output = "";

			for(b = 0; b < this.nbins; b++){
				horig = -1;
				key = this.bins[b].key;
				hbar = Math.abs(h*(this.bins[b].value/r));
				v = 0;
				for(s = 0; s < this.bins[b].values.length; s++) v += (this.bins[b].values[s]);
				htop = h*((v < 0 ? mx : mx-v)/r);
				hbot = Math.abs(h*((v >= 0 ? mn : v-mn)/r));
				if(isNaN(htop)) htop = h;
				hb = hbar;
				if(horig < 0) horig = htop+hb;
				hc = h-htop-hb;
				if(htop < 0) htop = 0;
				if(hbot < 0) hbot = 0;
				if(hc < 0) hc = 0;
				idbar = id+'-bar-'+(typeof key==="string" ? b : key.replace(/ /g,'-'));
				this.bins[b].id = idbar;

				cls = (!this.bins[b].selected ? ' deselected' : '');
				cls = (cls ? ' ':'') + this.attr.formatBar.call(this,key,this.bins[b].value);
				if(maketable){
					output += '<td id="'+idbar+'" style="width:'+(100/this.nbins).toFixed(3)+'%;height:100%;" class="'+(!this.bins[b].selected ? ' deselected' : '')+cls+'" data-index="'+b+'"><div class="antibar" style="height:'+htop.toFixed(4)+'%;"></div>';

					// Build individual series
					if(this.bins[b].values.length > 0){
						idbar = id+'-bar-'+(typeof key==="string" ? b : key.replace(/ /g,'-'));
						key = this.bins[b].key;
						var html = "";
						v = 0;
						for(s = this.bins[b].values.length - 1; s >= 0; s--){
							v += Math.abs(this.bins[b].values[s]);
						}
						for(s = this.bins[b].values.length - 1; s >= 0; s--){
							hbb = Math.abs(hb*((this.bins[b].values[s])/v));
							if(isNaN(hbb)) hbb = 0;
							output += '<a href="#" class="bar '+this.attr.formatBar.call(this,key,this.bins[b].values[s],s)+'" title="'+key+': '+(this.attr.units || "")+this.formatNumber(this.bins[b].values[s])+'" data-index-series="'+s+'" style="height:'+hbb.toFixed(4)+'%;"></a>';
						}
					}else{
						hbb = 0;
						output += '<a href="#" class="bar '+this.attr.formatBar.call(this,key,0,s)+'" title="'+key+': '+(this.attr.units || "")+this.formatNumber(0)+'" data-index-series="'+s+'" style="height:'+hbb+'px;"></a>';
					}

					output += '<div class="antibar" style="height:'+hbot.toFixed(4)+'%;"></div><div class="barbase"></div>'+(((typeof key==="string" && key.indexOf('-01')) || key.indexOf('-')==-1) ? '<span class="label">'+this.attr.formatX.call(this,key)+'</span>' : '')+'</td>';

				}else{
					p = S('#'+idbar+'');

					// Update top antibar
					S(p.find('.antibar')[0]).css({'height':htop.toFixed(4)+'%'});
					// Update bottom antibar
					S(p.find('.antibar')[1]).css({'height':hbot.toFixed(4)+'%'});

					// Update each series bar height
					var bars = p.find('.bar');
					for(var br = 0; br < bars.length; br++){
						var seriesbar = S(bars[br]);
						s = parseInt(seriesbar.attr('data-index-series'));
						v = 0;
						for(var s2 = this.bins[b].values.length - 1; s2 >= 0; s2--){
							v += Math.abs(this.bins[b].values[s2]);
						}
						hbb = hb*(Math.abs(this.bins[b].values[s])/v);
						if(isNaN(hbb)) hbb = 0;
						seriesbar.css({'height':hbb.toFixed(4)+'%'}).attr('title',key+': '+(this.attr.units || "")+this.formatNumber(this.bins[b].values[s]));
					}
					
					p.find('.label').html(this.attr.formatX.call(this,key));
				}
			}

			if(maketable){
				// Add the table cells
				S(this.target+' table tr').html(output);
				S(this.target).on('mouseleave',{me:this},function(e){ if(e.data){ e.data.me.trigger("mouseleave",{event:e}); } });
				S(this.target).on('mouseover',{me:this},function(e){ e.data.me.trigger("mouseover",{event:e}); });
			}

			// Attach the events
			if(!this.drawn){
				S(this.target+' .bar')
					.on('focus',{me:this,parent:this.attr.parent},function(e){ e.currentTarget = e.currentTarget.parentNode; e.data.me.trigger("barover",{event:e,bin:S(e.currentTarget).attr('data-index'),series:S(e.currentTarget).attr('data-index-series')}); })
				.parent()
					.on('click',{me:this,parent:this.attr.parent},function(e){ e.preventDefault(); e.data.me.trigger("barclick",{event:e,bin:S(e.currentTarget).attr('data-index')}); })
					.on('mouseover',{me:this,parent:this.attr.parent},function(e){ e.data.me.trigger("barover",{event:e,bin:S(e.currentTarget).attr('data-index')}); });
			}
			this.drawn = true;
		}
		return this;
	};
	
	// Attach a handler to an event for the Graph object in a style similar to that used by jQuery
	//   .on(eventType[,eventData],handler(eventObject));
	//   .on("resize",function(e){ console.log(e); });
	//   .on("resize",{me:this},function(e){ console.log(e.data.me); });
	BarChart.prototype.on = function(ev,e,fn){
		if(typeof ev!="string") return this;
		if(typeof fn=="undefined"){ fn = e; e = {}; }
		else{ e = {data:e}; }
		if(typeof e!="object" || typeof fn!="function") return this;
		if(this.events[ev]) this.events[ev].push({e:e,fn:fn});
		else this.events[ev] = [{e:e,fn:fn}];

		return this;
	};

	BarChart.prototype.off = function(ev){
		if(typeof ev != "string") return this;
		if(typeof this.events[ev]=="object") this.events[ev] = [];
		return this;
	};

	// Trigger a defined event with arguments. This is for internal-use to be 
	// sure to include the correct arguments for a particular event
	BarChart.prototype.trigger = function(ev,args){
		if(typeof ev != "string") return;
		if(typeof args != "object") args = {};
		var o = [];
		if(typeof this.events[ev]=="object"){
			for(var i = 0 ; i < this.events[ev].length ; i++){
				var e = G.extend(this.events[ev][i].e,args);
				if(typeof this.events[ev][i].fn == "function") o.push(this.events[ev][i].fn.call(this,e));
			}
		}
		if(o.length > 0) return o;
	};

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
	};
	
	BarChart.prototype.formatNumber = function(v){
		if(typeof v !== "number") return v;
		if(v >= 1e11) return Math.round(v/1e9)+"B";
		if(v >= 1e10) return (v/1e9).toFixed(1).replace(/\.?0+$/,"")+"B";
		if(v >= 1e9) return (v/1e9).toFixed(2).replace(/\.?0+$/,"")+"B";
		if(v >= 1e8) return Math.round(v/1e6)+"M";
		if(v >= 1e7) return (v/1e6).toFixed(1).replace(/\.0*$/,"")+"M";
		if(v >= 1e6) return (v/1e6).toFixed(2).replace(/\.0*$/,"")+"M";
		if(v >= 1e5) return Math.round(v/1e3)+"k";
		if(v >= 1e4) return Math.round(v/1e3)+"k";
		// Remove rounding issues
		return (''+v).replace(/0{5,}1$/,"");
	};

	S.barchart = function(target,bins,attr){ return new BarChart(target,bins,attr); };

})(S);
