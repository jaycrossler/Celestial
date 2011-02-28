// Celestial.js r1 - Jay Crossler - CC BY/3.0 license
			var multReal = 1, multCos = 0, multEven = 4;

var Celestial = {
	current_epoch_time: 0,
	parent_planet:0,
	epoch_timestep: 1,
	last_queried_epoch_time: 0,
	last_displayed_epoch_time: 0,
	time_display_method: 'yearday', //'yearday', 'date'
	spacingMethod: 'realistic', //'evenly', 'realistic', 'artistic'
	sizingMethod: 'realistic', //'equal', 'realistic', 'artistic'
	pixelSizeXZ: 250,
	pixelSizeY: 200,
	furthest_planet:-1,
	furthest_planet_posn:null,
	furthest_planet_distkm:-1,
	scaler_axes:null,
	Planets: [],
	
	planetLocation: function(planetid, epoch, scale_up) {
		var pos = null;
		var rot = null;
		if (!scale_up) scale_up = 1; //if 2, then don't scale, if 3 then use base realistic
		var spacingMethod = (scale_up == 3) ? 'realistic' : Celestial.spacingMethod;
		var updatecurrent = (epoch) ? false : true;  //If a different epoch is passed in, don't save
		
 		switch(spacingMethod) {
		case 'evenly':
			pos = {x:(planetid * (Celestial.pixelSizeXZ / (Celestial.Planets.length-1))),y:0, z:0};
			rot = {x:0, y:Celestial.Planets[planetid].rotation.y += .004 || 0, z:0};//Math.random() * 200 - 100, y:Math.random() * 200 - 100, z:Math.random() * 200 - 100};
		  	break;
		case 'artistic':
			// A mix of the real distance, a wieghted cosine of the distance, and the orbit #s distance

			//Find the three percentages of distance
			var per_actual = Celestial.Planets[planetid].dist_from_parent / Celestial.furthest_planet_distkm;
			var per_cosine = Math.cos(per_actual * Math.PI / 2);
			var per_orbits = planetid / (Celestial.Planets.length-1);
			var percentage = ((multReal*per_actual) + (multCos*per_cosine) + (multEven*per_orbits)) / (multReal+multCos+multEven);
			var multiplier = percentage * Celestial.pixelSizeXZ;

			//Find the realistic location
			var loc = Celestial.planetLocation(planetid, epoch, 3);
			
			//Use trig to find the vector to the planet, then multiply that by the weighted multiplier
			var angle = Math.atan(loc.position.z/loc.position.x) || 0;			
			pos = { x: (multiplier * Math.acos(angle)),
					y: (loc.position.y),
					z: (multiplier * Math.asin(angle))  };
if (loginfo>1) console.log("Planet:" + planetid + " A%" +Math.round(100*per_actual) + " C%" +Math.round(100*per_cosine) + " O%" +Math.round(100*per_orbits) + " %%" +Math.round(100*percentage) + " x:"+pos.x+" z:"+pos.z + " SQ:"+(Math.sqrt(pos.x * pos.x)+Math.sqrt(pos.y * pos.y)));

//			rot = loc.rotation;

			rot = {x:0, y:Celestial.Planets[planetid].rotation.y += .004, z:0};//Math.random() * 200 - 100, y:Math.random() * 200 - 100, z:Math.random() * 200 - 100};

		  	break;
		case 'realistic' || (scale_up ==3):
			var P = Celestial.Planets[planetid];
			var time = (epoch) ? epoch : Celestial.current_epoch_time;
			
			switch (P.orbit_calc_method) {
			case 'major_planet':
				//Derived from mysite.verizon.net/res148h4j/javascript/script_planet_orbits.html

				var DEGS = 180/Math.PI;      // convert radians to degrees
				var RADS = Math.PI/180;      // convert degrees to radians
				var EPS  = 1.0e-12;          // machine error constant
				var cy = time/36525;         // centuries since J2000
				
				var ap = P.a_semimajor_axis + (P.a_per_cy*cy);
				var ep = P.e_eccentricity + (P.e_per_cy*cy);
				var ip = P.i_inclination + (P.i_per_cy*cy/3600)*RADS;
				var op = P.O_ecliptic_long + (P.O_per_cy*cy/3600)*RADS;
				var wp = P.w_perihelion + (P.w_per_cy*cy/3600)*RADS;
				var lp = Celestial.mod2pi((P.L_mean_longitude + P.L_per_cy*cy/3600)*RADS);		
		
				// position of planet in its orbit
				var mp = Celestial.mod2pi(lp - wp);
				var vp = Celestial.true_anomaly(mp, ep);  //TODO: if ep >1, then error
				var rp = ap*(1 - ep*ep) / (1 + ep*Math.cos(vp));
				
				// heliocentric rectangular coordinates of planetid
				var dx = rp*(Math.cos(op)*Math.cos(vp + wp - op) - Math.sin(op)*Math.sin(vp + wp - op)*Math.cos(ip));
				var dz = rp*(Math.sin(op)*Math.cos(vp + wp - op) + Math.cos(op)*Math.sin(vp + wp - op)*Math.cos(ip));
				var dy = rp*(Math.sin(vp + wp - op)*Math.sin(ip));

				var distscaler = (scale_up == 1) ? Celestial.systemScaler() : {xz: 1, y:1};  //Scale the distances if asked to
				pos = {x: distscaler.xz*dx, y: distscaler.y*dy, z: distscaler.xz*dz};
if (loginfo>0)	console.log("Planet:" + planetid + " x:"+pos.x+" z:"+pos.z + " SQ:"+(Math.sqrt(pos.x * pos.x)+Math.sqrt(pos.y * pos.y)));

				// Find the remainder when the current epoch time is modded by the rotational period of the planetid
				var daylength_in_centuries = 0.0000273785 * P.rotation_sidereal_in_days;
				var dayrem = Celestial.fmod(time, daylength_in_centuries);
				var daypercent = dayrem / daylength_in_centuries;
			
				//echo("Day is" SPC %daypercent SPC "% of" SPC %daylength_in_centuries SPC "lengthed days");
				var xr = P.obliquity;
				var zr = 0;
				var yr = daypercent * 360;

				//Rotate the planetid on the correct planetary axis
				//rot = RotateVectorOnZX(%zr, %xr);
				rot = {x:0, y:P.rotation.y += .004 || 0.004, z:0};
	//TODO: Fix Rotation
				break;
			case 'luna':
// 				%parentid = Orrery_GetPlanetIDByName(%orreryHandler, %p.satelliteOf);
// 				%trans_parent = %orreryHandler.planet_location(%parentid, 3, "", true);
// 				//echo ("Earth is at:" SPC %trans_parent);
// 				
// 				%np = %p.N_long_asc + (%p.N_per_cy*%time);
// 				%ip = %p.i_inclination;
// 				%wp = %p.w_arg_perigee + (%p.w_per_cy*%time/3600);
// 				%ap = %p.a_mean_dist;
// 				%ep = %p.e_eccentricity;
// 				%mp = %p.M_mean_anomaly + (%p.m_per_cy*%time/3600);
// 				
// 				%rads = %orreryHandler.deg_to_radian_mult;
// 	
// 				%vp = true_anomaly(%mp, %ep);
// 			
// 				%Nm = range360(%p.N_long_asc + (%p.N_per_cy * %time)) * %rads;
// 				%im = %p.i_inclination * %rads;
// 				%wm = range360(%p.w_arg_perigee + %p.w_per_cy * %time) * %rads;
// 				%am = %p.a_mean_dist * 10; //*10 - to make it far enough from planetid to be seen
// 				%ecm = %p.e_eccentricity;
// 				%Mm = range360(%p.M_mean_anomaly + %p.m_per_cy * %time) * %rads;
// 			
// 				//   position of Moon
// 				%em = true_anomaly(%Mm, %ecm);
// 	
// 				%xv = %am * (mCos(%em) - %ecm);
// 				%yv = %am * (mSqrt(1 - (%ecm * %ecm)) * mSin(%em));
// 				
// 				%rm = mSqrt(%xv * %xv + %yv * %yv);
// 				%vm = mAtan2(%xv, %yv);  //Same as Atan2?
// 	
// 				%x = %rm * (mCos(%Nm) * mCos(%vm + %wm) - mSin(%Nm) * mSin(%vm + %wm) * mCos(%im));
// 				%y = %rm * (mSin(%Nm) * mCos(%vm + %wm) + mCos(%Nm) * mSin(%vm + %wm) * mCos(%im));
// 				%z = %rm * (mSin(%vm + %wm) * mSin(%im));
// 				//echo ("Moon mod:" SPC %x SPC %y SPC %z);
// 				
// 				
// 				//TODO: Use higher accuracy method! 
// 				//http://n2.nabble.com/Astronomical-Formulae-td1134861.html
// 	
// 	
// 				// Find the remainder when the current epoch time is modded by the rotational period of the planetid
// 				%daylength_in_centuries = 0.0000273785 * %p.rotation_sidereal_in_days;
// 				%dayrem = mFmod(%time, %daylength_in_centuries);
// 				%daypercent = %dayrem / %daylength_in_centuries;
// 			
// 				//echo("Day is" SPC %daypercent SPC "% of" SPC %daylength_in_centuries SPC "lengthed days");
// 				%xr = %p.obliquity;
// 				%yr = 0;
// 				%zr = %daypercent * 360;
// 	
// 				//Rotate the moon on the correct planetary axis
// 				%trans_luna = %x SPC %y SPC %z SPC GetWords(MatrixCreateFromEuler(%xr SPC %yr SPC %zr),3,6);
// 	
// 				//Use the magic of matrix multiplication to find how the moon is extended from the planetid
// 				%mat_luna = MatrixMultiply(%trans_parent, %trans_luna);
// 				%dx = GetWord(%mat_luna,0);
// 				%dy = GetWord(%mat_luna,1);
// 				%dz = GetWord(%mat_luna,2);
// 				%finalrotation = "1 0 0" SPC %xr; //GetWords(%mat_luna,3,6);
// 				//TODO: Is moon rotating too much?
			
				break;
			case 'simplemoon':
				console.log("Skipping because it's a simple moon");
				break;
			default: //star
				pos={x:0, y:0, z:0};
				rot={x:0, y:0, z:0};
				break;
			}
		  	break;
		default:
		  	break;
		}
		if (updatecurrent) {
			Celestial.Planets[planetid].position = pos;
			Celestial.Planets[planetid].rotation = rot;
		}		
		return {position: pos, rotation: rot};
	},
	true_anomaly: function ( mp, ep) {
		// compute the true anomaly of an orbit from mean anomaly using iteration
		// mp- mean anomaly in radians
		// ec- orbit eccentricity
// 		var dp = 5; // decimal points
// 		
// 		var K=Math.PI/180.0;
// 		var S=Math.sin(mp);
// 		var C=Math.cos(mp);
// 		if(ep < -1) ep = -1;
// 		var f=Math.sqrt(1.0-ep*ep);
// 		var p=Math.atan2(f*S,C-ep)/K;
// 		return Math.round(p*Math.pow(10,dp))/Math.pow(10,dp);

 	
 		// initial approximation of eccentric anomaly
 		var E = mp + ep*Math.sin(mp)*(1.0 + ep*Math.cos(mp));
 	
 		// iterate to improve accuracy
 		var loop = 0;
 		while ( loop < 20 ) { //TODO: Check how many times to loop
 			var eone = E;
 			E = eone - (eone - ep*Math.sin(eone) - mp)/(1 - ep*Math.cos(eone));
 	
 			if (Math.abs( E - eone) < 0.0000007) break;
 			loop++;
 		}
 		
 		// convert eccentric anomaly to true anomaly
 		var V = 2*Math.atan2(Math.sqrt((1+ep)/(1-ep))*Math.tan(0.5*E),1);
 		// modulo 2pi
 		if (V < 0) V = V + (2 * Math.PI); 
 
 		return V;
	},
	mod2pi: function ( x ) {
		// return an angle in the range 0 to 2pi
		b = x / (2*Math.PI);
		a = (2*Math.PI)*(b - Celestial.abs_floor(b));
		if (a < 0) a = (2*Math.PI) + a;
		return a; 
	},
	abs_floor: function (x) {
		// return the integer part of a number
		return (x >= 0) ? Math.floor(x) : Math.ceil(x);
	},
	fmod: function (a, b){
		var x = Math.floor(a/b);
		return a - b*x;
	},
	planetsCount: function() {
		return Celestial.Planets.length;
	},
	planetInfo: function(planetid, infotype, epoch) {
		switch(infotype) {
		case 'type':
		  return Celestial.Planets[planetid].orbit_calc_method ;
		  break;
		case 'texture':
		  return (Celestial.Planets[planetid].texture) ? Celestial.Planets[planetid].texture : 'textures/'+Celestial.Planets[planetid].planetName+'_surface.jpg';
		  break;
		case 'posrot':
		  return Celestial.planetLocation(planetid, epoch);
		  break;
		case 'position':
		  return {x:(planetid * (Celestial.pixelSizeXZ / Celestial.Planets.length)),y:0, z:0}; //TODO, use PlanetLocation
		  break;
		case 'rotation':
		  return {x:Math.random() * 200 - 100, y:Math.random() * 200 - 100, z:Math.random() * 200 - 100};
		  break;
		case 'name':
		  return Celestial.Planets[planetid].planetName;
		  break;
		case 'pixelwidth':
		  return Celestial.planetSizing(planetid);
		  break;
		default:
		  console.warn("Planet Info requested for Planet #"+planetid+", unknown type "+infotype);
		}	
	},
	init: function(planet_init_list,_pixelSizeXZ,_pixelSizeY) {
		//current_epoch_time = MathDateTime_Create(%varTimeObject, 2000,1,1,12,0,0,0);
		Celestial.pixelSizeXZ = _pixelSizeXZ;
		Celestial.pixelSizeY = _pixelSizeY;
		Celestial.furthest_planet = -1;
		Celestial.furthest_planet_posn = {xz:0,y:0};
		Celestial.furthest_planet_distkm = -1;
		Celestial.last_queried_epoch_time = 0;
		Celestial.last_displayed_epoch_time = 0;
		Celestial.parent_planet = 0;
		Celestial.scaler_axes = null;
		var parent_planet_name = planet_init_list[Celestial.parent_planet].planetName;

		Celestial.Planets = [];
		Celestial.setEpoch();

		//Add each planet from json into the planet list
		for ( var i = 0, l = planet_init_list.length; i < l; i ++ ) {
			if ((planet_init_list[i].satelliteOf == parent_planet_name) || (planet_init_list[i].planetName == parent_planet_name)) {
				planet_init_list[i].position = {x:0,y:0,z:0};
				planet_init_list[i].rotation = {x:0,y:0,z:0};
				Celestial.Planets.push( planet_init_list[i] );
			}
		}
		Celestial.furthest_planet = Celestial.planetFurthest();
		Celestial.furthest_planet_distkm = Celestial.Planets[Celestial.furthest_planet].dist_from_parent;

		//Set initial positions
		for ( var i = 0, l = Celestial.Planets.length; i < l; i ++ ) {
			Celestial.planetLocation(i);
		}
		Celestial.axisLongest(); //TODO: AxisLongest not being set at right time.
//		Celestial.furthest_planet_posn = Celestial.Planets[Celestial.furthest_planet].position;
		
		console.log("Celestial library initialized with planets from JSON:" + planet_init_list.length);
		console.log("Celestial planets in memory:" + Celestial.Planets.length);
	},
	setEpoch: function (year, month, day, hour, mins, secs) {
		Celestial.current_epoch_time = Celestial.convertTimeToEpoch(year, month, day, hour, mins, secs) ;
		console.log('New time is:'+ Celestial.current_epoch_time);
	},
	addDay: function () {
		Celestial.current_epoch_time++;
		Celestial.last_queried_epoch_time=0;
	},
	addHour: function () {
		Celestial.current_epoch_time+=0.041666667;
		Celestial.last_queried_epoch_time=0;
	},	
	addMinute: function () {
		Celestial.current_epoch_time+=0.000694444;
		Celestial.last_queried_epoch_time=0;
	},	
	addSecond: function () {
		Celestial.current_epoch_time+=0.000011574;
		Celestial.last_queried_epoch_time=0;
	},	
	convertTimeToEpoch: function (year, month, day, hour, mins, secs) {
		
		var now = (year) ? new Date(year, month | 0, day | 0, hour | 0, mins | 0, secs | 0) : new Date();
		// day number to/from J2000 (Jan 1.5, 2000), Julian Date 2451545
		year  = now.getUTCFullYear();
		month = now.getUTCMonth();
		day   = now.getUTCDate();
		hour  = now.getUTCHours();
		mins  = now.getUTCMinutes();
		secs  = now.getUTCSeconds();
	
		var h = hour + mins/60;
		var rv = 367*year 
			   - Math.floor(7*(year + Math.floor((month + 9)/12))/4) 
			   + Math.floor(275*month/9) + day - 730531.5 + h/24;
	    return rv;
	},
	displayTime: function(format) {
// 		if (Celestial.last_queried_epoch_time == Celestial.current_epoch_time) {
// 			//Hasn't changed, show the stored version
// 			return Celestial.last_displayed_epoch_time;
// 		}
 		if (!format) format = Celestial.time_display_method;
		var rv;
		
		switch(format) {
		case 'yearday':
			var yr = Math.floor(Celestial.current_epoch_time / 365.25);
			var day = Math.floor(.5 + Celestial.current_epoch_time-(yr * 365.25));
			yr+=2000;
			var eday = Celestial.current_epoch_time.toFixed(3);
		  	rv = "Epoch Day "+ eday +"  Year:" + yr + " Day:" + day;
		  	break;
		case 'date':
		//TODO: Time doesn't seem to be working
			var datetime = new Date(new Date(2000,0,0,11,57,27).getTime() + (Celestial.current_epoch_time *24 * 60 *60 * 1000 ));
			var yyyy = datetime.getFullYear();
			var mm = datetime.getMonth() + 1;
			var dd = datetime.getDate();
			rv = "Solar Time: " + mm + "/" + dd + "/" + yyyy;
		  	break;
		}	

		//Cache as last displayed time
		Celestial.last_queried_epoch_time = Celestial.current_epoch_time;
		Celestial.last_displayed_epoch_time = rv;
		return rv;
	},
	planetFurthest: function() {
	//TODO: make sure they only apply to ones with same parents_of
		if (Celestial.furthest_planet < 0) {
			Celestial.furthest_planet = 0;
			for ( var l = Celestial.Planets.length, i = l-1; i > 0; i-- ) {
				if ((Celestial.Planets[i].dist_from_parent) && Celestial.Planets[i].dist_from_parent > Celestial.Planets[Celestial.furthest_planet].dist_from_parent)
					Celestial.furthest_planet = i;
			}
		}
		return Celestial.furthest_planet;
	},
	axisLongest: function() {
//		if (!Celestial.furthest_planet_posn.xz == 0) return Celestial.furthest_planet_posn;
		var posLongest = Celestial.planetLocation(Celestial.planetFurthest(),Celestial.current_epoch_time,3).position;
		var posCenter = Celestial.planetLocation(Celestial.parent_planet,Celestial.current_epoch_time,3).position;
		posLongest.x -= posCenter.x;
		posLongest.y -= posCenter.y;
		posLongest.z -= posCenter.z;
		
		var longestxz = (Math.abs(posLongest.x) > Math.abs(posLongest.z)) ? Math.abs(posLongest.x) : Math.abs(posLongest.z);
		Celestial.furthest_planet_posn = {xz: longestxz, y: Math.abs(posLongest.y)}
		return Celestial.furthest_planet_posn;
	},
	systemScaler: function() {
		if (Celestial.scaler_axes) return Celestial.scaler_axes;

		var distscaler = Celestial.axisLongest();

		distmultxz = Celestial.pixelSizeXZ / distscaler.xz * 0.9;
		distmulty  = Celestial.pixelSizeY  / distscaler.y * 0.7;

		Celestial.scaler_axes = {xz: distmultxz, y: distmulty}
		return Celestial.scaler_axes;
	},
	planetSizing: function(planetid) {
		switch(Celestial.sizingMethod) {
		case 'realistic':
			if (planetid == 0) return 3;
			return 1;
			break;
		case 'equal':
			return 5;
			break;
		case 'artistic':
			if (planetid == 0) return 20;
			return 5;
			break;
		default:
			break;
		}
	}
};