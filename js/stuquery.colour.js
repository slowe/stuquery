/*

	Colour tools

	Requires stuquery
*/
(function(){

	function Rainbow(){
		this.version = "0.1";

		this.scales = {
			'Viridis': 'rgb(122,76,139) 0, rgb(124,109,168) 12.5%, rgb(115,138,177) 25%, rgb(107,164,178) 37.5%, rgb(104,188,170) 50%, rgb(133,211,146) 62.5%, rgb(189,229,97) 75%, rgb(254,240,65) 87.5%, rgb(254,240,65) 100%',
			'Viridis10': ['#440154', '#472777', '#3E4989', '#30678D', '#25828E', '#1E9C89', '#35B778', '#6BCD59', '#B2DD2C', '#FDE724'],
			'ODI': 'rgb(114,46,165) 0%, rgb(230,0,124) 50%, rgb(249,188,38) 100%',
			'Heat': 'rgb(0,0,0) 0%, rgb(128,0,0) 25%, rgb(255,128,0) 50%, rgb(255,255,128) 75%, rgb(255,255,255) 100%',
			'Planck': 'rgb(0,0,255) 0, rgb(0,112,255) 16.666%, rgb(0,221,255) 33.3333%, rgb(255,237,217) 50%, rgb(255,180,0) 66.666%, rgb(255,75,0) 100%',
			'EPC': '#ef1c3a 1%, #ef1c3a 20.5%, #f78221 20.5%, #f78221 38.5%, #f9ac64 38.5%, #f9ac64 54.5%, #ffcc00 54.5%, #ffcc00 68.5%, #8cc63f 68.5%, #8cc63f 80.5%, #1bb35b 80.5%, #1bb35b 91.5%, #00855a 91.5%, #00855a 120%',
			'Plasma': 'rgb(12,7,134) 0, rgb(82,1,163) 12.5%, rgb(137,8,165) 25%, rgb(184,50,137) 37.5%, rgb(218,90,104) 50%, rgb(243,135,72) 62.5%, rgb(253,187,43) 75%, rgb(239,248,33) 87.5%',
			'Referendum': '#4BACC6 0, #B6DDE8 50%, #FFF380 50%, #FFFF00 100%',
			'Gender': '#0DBC37 0, #FFFFFF 50%, #722EA5 100%',
			'Leodis': '#2254F4 0%, #F9BC26 50%, #ffffff 100%',
			'Longside': '#801638 0%, #addde6 100%'
		}
		this.min = 0;
		this.max = 1;
		this.scale = this.scales['Viridis'];
		this.colours = extractColours(this.scale,this.min,this.max);

		return this;
	}
	Rainbow.prototype.log = function(){
		var args = Array.prototype.slice.call(arguments, 0);
		if(console && typeof console.log==="function") console.log('Rainbow',args);
		return this;
	}
	Rainbow.prototype.setDataRange = function(min,max){
		if(typeof min==="number") this.min = min;
		if(typeof max==="number") this.max = max;
		this.setScale();
		return this;
	}
	Rainbow.prototype.setScale = function(str){
		if(str){
			if(this.scales[str]) this.scale = this.scales[str];
			else{
				if(str.indexOf('#')>=0 || str.indexOf('rgb')>=0) this.scale = str;
				else this.log('Colour scale not found: ',str);
			}
		}
		//this.log('setScale',str,this.min,this.max,this.scale)
		this.colours = extractColours(this.scale,this.min,this.max);
		
		return this;
	}
	Rainbow.prototype.getCSS = function(){
		return 'background: '+this.colours[0].c.hex+'; background: -moz-linear-gradient(left, '+this.scale+');background: -webkit-linear-gradient(left, '+this.scale+');background: linear-gradient(to right, '+this.scale+');';
	}
	Rainbow.prototype.getTextColour = function(c){
		return setTextColor(c);
	}
	Rainbow.prototype.getColour = function(v,attr){
		if(!attr) attr = {};

		if(typeof attr.min==="number" && typeof attr.max==="number") this.setDataRange(attr.min,attr.max);
		if(attr.scale) this.setScale(attr.scale);
		var r,g,b,a;

		var cs = this.colours;
		if(typeof v!=="number") return "";

		if(cs.length == 1){
			r = cs[0].c.rgb[0];
			g = cs[0].c.rgb[1];
			b = cs[0].c.rgb[2];
			a = v / this.max;
			var colour = 'rgba('+cs[0].c.rgb[0]+', '+cs[0].c.rgb[1]+', '+cs[0].c.rgb[2]+', ' + v / this.max + ")";
		}else{
			var colour = "";
			if(v < this.min){
				r = this.colours[0].c.rgb[0];
				g = this.colours[0].c.rgb[1];
				b = this.colours[0].c.rgb[2];
			}else{
				for(var c = 0; c < cs.length-1; c++){
					if(v >= cs[c].v){
						var pc = (v - cs[c].v)/(cs[c+1].v-cs[c].v);
						var a = cs[c].c;
						var b = cs[c+1].c;
						if(v > this.max) pc = 1;	// Don't go above colour range
						r = parseInt(a.rgb[0] + (b.rgb[0]-a.rgb[0])*pc);
						g = parseInt(a.rgb[1] + (b.rgb[1]-a.rgb[1])*pc);
						b = parseInt(a.rgb[2] + (b.rgb[2]-a.rgb[2])*pc);
						continue;
					}
				}
			}
			colour = 'rgb('+r+','+g+','+b+')';
		}
		if(attr.format && attr.format=="hex") return "#"+d2h(r)+d2h(g)+d2h(b);
		return colour;	
	}
	Rainbow.prototype.create = function(c,n){
		return new Colour(c,n);
	}
	function d2h(d) { return ((d < 16) ? "0" : "")+d.toString(16);}
	function h2d(h) {return parseInt(h,16);}

	// Define colour routines
	function Colour(c,n){
		if(!c) return {};

		this.alpha = 1;

		// Let's deal with a variety of input
		if(c.indexOf('#')==0){
			this.hex = c;
			this.rgb = [h2d(c.substring(1,3)),h2d(c.substring(3,5)),h2d(c.substring(5,7))];
		}else if(c.indexOf('rgb')==0){
			var bits = c.match(/[0-9\.]+/g);
			if(bits.length == 4) this.alpha = parseFloat(bits[3]);
			this.rgb = [parseInt(bits[0]),parseInt(bits[1]),parseInt(bits[2])];
			this.hex = "#"+d2h(this.rgb[0])+d2h(this.rgb[1])+d2h(this.rgb[2]);
		}else return {};
		this.hsv = rgb2hsv(this.rgb[0],this.rgb[1],this.rgb[2]);
		this.name = (n || "Name");
		var r,sat;
		for(r = 0, sat = 0; r < this.rgb.length ; r++){
			if(this.rgb[r] > 200) sat++;
		}
		this.text = (this.rgb[0] + this.rgb[1] + this.rgb[2] > 500 || sat > 1) ? "black" : "white";
		return this;
	}

	/**
	 * Converts an RGB color value to HSV. Conversion formula
	 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
	 * Assumes r, g, and b are contained in the set [0, 255] and
	 * returns h, s, and v in the set [0, 1].
	 *
	 * @param   Number  r       The red color value
	 * @param   Number  g       The green color value
	 * @param   Number  b       The blue color value
	 * @return  Array           The HSV representation
	 */
	function rgb2hsv(r, g, b){
		r = r/255, g = g/255, b = b/255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, v = max;
		var d = max - min;
		s = max == 0 ? 0 : d / max;
		if(max == min) h = 0; // achromatic
		else{
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return [h, s, v];
	}

/*
	function getColour(pc,a,b){
		return 'rgb('+parseInt(a.rgb[0] + (b.rgb[0]-a.rgb[0])*pc)+','+parseInt(a.rgb[1] + (b.rgb[1]-a.rgb[1])*pc)+','+parseInt(a.rgb[2] + (b.rgb[2]-a.rgb[2])*pc)+')';
	}*/

	// Send the colour stops as a string along with the minimum and maximum values
	function extractColours(c,mn,mx){
		var stops = c.replace(/^\s+/g,"").replace(/\s+$/g,"").replace(/\s\s/g," ").split(', ');
		var cs = new Array();
		for(var i = 0; i < stops.length; i++){
			var bits = stops[i].split(/ /);
			if(bits.length==2) cs.push({'v':bits[1],'c':new Colour(bits[0])})
			else if(bits.length==1) cs.push({'c':new Colour(bits[0])});
		}
		var r = mx-mn;
		for(var c=0; c < cs.length;c++){
			// If a colour-stop has a percentage value provided, 
			if(cs[c].v && cs[c].v.indexOf('%')>0) cs[c].v = (mn + parseFloat(cs[c].v)*r/100);
		}
		if(!cs[0].v) cs[0].v = mn; // Set the minimum value
		if(!cs[cs.length-1].v) cs[cs.length-1].v = mx; // Set the maximum value
		var skip = 0;
		// If a colour-stop doesn't have a specified position and it isn't the first
		// or last stop, then it is assigned the position that is half way between
		// the previous stop and next stop
		for(var c=1; c < cs.length;c++){
			// If we haven't got a value we increment our counter and move on
			if(!cs[c].v) skip++;
			// If we have a value and the counter shows we've skipped some
			// we now back-track and set them.
			if(cs[c].v && skip > 0){
				for(var d = 1; d <= skip ; d++){
					a = cs[c-skip-1].v;
					b = cs[c].v;
					cs[c-d].v = a + (b-a)*(skip-d+1)/(skip+1);
				}
				todo = 0;
			}
		}
		return cs;
	}

	function setTextColor(hex){
		if(!hex) return '';
		var colour = new Colour(hex);
		hex = colour.hex;
		var L1 = getL(hex);
		var Lb = getL('#000000');
		var Lw = getL('#ffffff');
		var rb = (Math.max(L1, Lb) + 0.05) / (Math.min(L1, Lb) + 0.05);
		var rw = (Math.max(L1, Lw) + 0.05) / (Math.min(L1, Lw) + 0.05);
		if(L1 == Lw) return '#000000';
		return (rb > rw ? '#000000':'#FFFFFF');
	}

	function getL(c) {
		return (0.2126 * getsRGB(c.substr(1, 2)) + 0.7152 * getsRGB(c.substr(3, 2)) + 0.0722 * getsRGB(c.substr(-2)));
	}

	function getRGB(c) {
		try { var c = parseInt(c, 16); } catch (err) { var c = false; }
		return c;
	}

	function getsRGB(c) {
		c = getRGB(c) / 255;
		c = (c <= 0.03928) ? c / 12.92 : Math.pow(((c + 0.055) / 1.055), 2.4);
		return c;
	}

	// Make something publicly visible
	S.colour = function(){ return new Rainbow(); }

})(S);
