/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author paulirish / http://paulirish.com/
 */



function bind( scope, fn ) {
	return function () {
		fn.apply( scope, arguments );
	};
}

CameraControlWASD = function ( camera, movement_speed, look_speed, nofly, look_vertical, panviamouse, zoomonclick ) {

	this.pan_screen_via_mouse = panviamouse !== undefined ? panviamouse : true;
	this.zoom_on_click = zoomonclick !== undefined ? zoomonclick : false;

	this.movement_speed = movement_speed !== undefined ? movement_speed : 1.0;
	this.look_speed = look_speed !== undefined ? look_speed : 0.005;

	this.moveDist = 6;

	this.nofly = nofly;
	this.look_vertical = look_vertical;
	
	this.camera = camera;
	
	this.mouseX = 0;
	this.mouseY = 0;
	
	this.touchState = {};
	
	this.lat = 0;
	this.lon = 0;
	this.phy = 0;
	this.theta = 0;
	this.targetObject = 0;
	
	this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;
	this.moveUp = false;
	this.moveDown = false;
	this.moveShouldStop = false;
	this.windowHalfX = window.innerWidth / 2;
	this.windowHalfY = window.innerHeight / 2;

	this.objectAtScreenXY = function(x,y) {
		//TODO: Size selection vector based on container size

		//Look for what was clicked on
		var vector = new THREE.Vector3( ( x / window.innerWidth ) * 2 - 1, - ( y / window.innerHeight ) * 2 + 1, 0.5 );
		projector.unprojectVector( vector, camera );
		var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );

		var intersects = ray.intersectScene( scene, false );

		return (intersects[ 0 ]) ? intersects[ 0 ] : null;
	}

	this.onDocumentMouseDown = function ( event ) {
		event.preventDefault();
		
		var objectClicked = this.objectAtScreenXY(event.clientX,event.clientY);
		
		if (objectClicked && objectClicked.object.planetid) {  //Check if it's a number of a planet
			planetWasClicked(objectClicked.object.planetid);
//			div_info.innerHTML='Clicked: '+objectClicked.name;
		} else {
//			div_info.innerHTML='';
			//Object not clicked, handle move instead
			if (this.zoom_on_click) {
				event.stopPropagation();
				switch ( event.button ) {
					case 0: this.moveForward = true; break;
					case 2: this.moveBackward = true; break;		
				}
			} else {
				this.pan_screen_via_mouse = true;
			}
		}
	};

	this.onDocumentMouseUp = function ( event ) {

		if (this.zoom_on_click) {
			event.preventDefault();
			event.stopPropagation();

			switch ( event.button ) {
				case 0: this.moveForward = false; break;
				case 2: this.moveBackward = false; break;
			}
		} else {
			this.pan_screen_via_mouse = false;
		}

	};

	this.onDocumentMouseMove = function (event) {
		if (this.pan_screen_via_mouse) {
			//TODO: Move the camera accordingly, not just the mouse position
			this.mouseX = ( event.clientX - this.windowHalfX );
			this.mouseY = ( event.clientY - this.windowHalfY );
		}

	};
	this.onDocumentMouseScroll = function (event) {
		var delta = 0;
		if (!event) event = window.event;/* For IE. */
		if (event.wheelDelta) { /* IE/Opera. */
				delta = event.wheelDelta/120;
				if (window.opera) delta = -delta;
		} else if (event.detail) { /** Mozilla case. */
				delta = -event.detail/3;
		}

		if (delta) {
			if (delta > 0) {
				this.move('move_forward', this.movement_speed, 'SCROLL UP '+Math.round(length));
			} else {
				this.move('move_back', this.movement_speed, 'SCROLL DOWN '+Math.round(length));
			}
			this.moveShouldStop = true;
		}		
		if (event.preventDefault) event.preventDefault();
		event.returnValue = false;				
	};
	this.onDocumentKeyDown = function ( event ) {

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ this.move('rot_forward', this.movement_speed, 'FORWARD '+this.movement_speed);
				break;

			case 43: /* + */
			case 187: /* = */ this.moveUp = true; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = true; break;

			case 40: /*down*/
			case 83: /*S*/ this.move('rot_back', this.movement_speed, 'BACKWARD '+this.movement_speed);
				break;

			case 45: /* - */
			case 189: /* _ */ this.moveDown = true; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = true; break;

			case 80: /*p*/
			case 112: /*P*/ clickit(7); break;

			case 76: /*l*/
			case 108: /*L*/ clickit(8); break;

		}

	};
	this.onDocumentKeyUp = function ( event ) {

		switch( event.keyCode ) {

//			case 38: /*up*/
//			case 87: /*W*/ this.moveForward = false; break;

			case 43: /* + */
			case 187: /* = */ this.moveUp = false; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = false; break;

//			case 40: /*down*/
//			case 83: /*S*/ this.moveBackward = false; break;

			case 45: /* - */
			case 189: /* _ */ this.moveDown = false; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = false; break;
		}				
	};

	this.dist = function() {
		var distance = 0;
		var cCamera = this.camera.position;
		var cTarget;
		if (this.targetObject)	{
			cTarget = this.camera.target.position;
		} else {
			cTarget = {x:0, y:0, z:0};
		}
		var dx = cCamera.x - cTarget.x;
		var dy = cCamera.y - cTarget.y;
		var dz = cCamera.z - cTarget.z;
		distance = Math.sqrt (dx*dx + dy*dy + dz*dz);		
			
		return distance;	
	}
	this.update = function() {
// 		if ( this.moveForward ) {
// 			if (this.dist() > (this.movement_speed)) {
// 				this.move('rot_forward', this.movement_speed, 'FORWARD '+this.movement_speed);
// 			}
// 		}
// 		if ( this.moveBackward ) {
// 				this.move('rot_back', this.movement_speed, 'BACKWARD '+this.movement_speed);
// 		}
		if ( this.moveUp ) {
			this.move('move_up', this.movement_speed, 'UP '+this.movement_speed);
		}
		if ( this.moveDown ) {
				this.move('move_down', this.movement_speed, 'DOWN '+this.movement_speed);
		}
		if ( this.moveLeft ) {
				this.move('rot_left', this.movement_speed, 'LEFT '+this.movement_speed);
		}
		if ( this.moveRight ) {
				this.move('rot_right', this.movement_speed, 'RIGHT '+this.movement_speed);
		}

		if (this.moveShouldStop) { // stop moving if it was from scrolling
			this.moveForward = false; this.moveBackward = false; this.moveUp = false; this.moveDown = false;
		}

//TODO: Find a better way of doing this:
		if (this.targetObject && option_RenderEngine == "webgl") this.camera.target=this.targetObject;
	};

	this.gestureStart = function(e) {
	//TODO: Turn Gestures on if two finger drags can be adequately captured
		e.preventDefault ();
//		div_info.innerHTML='EDIT:  scale:'+e.scale+' rot:' + e.rotation +'<br/>';
		this.touchState.gestureInProgress = true;
	}
	this.gestureChange = function(e) {
		var target = e.target;
		e.preventDefault ();

//		div_info.innerHTML='CHANGE:  scale:'+e.scale+' rot:' + e.rotation +'<br/>';


		if (e.scale > 1.1) {
			this.move('move_forward', this.movement_speed/2);
		}
		if (e.scale < 0.9) {
			this.move('move_back', this.movement_speed/2);
		}
		var rotNew = e.rotation;
		if (Math.abs(rotNew) > 2) {
			//There's been a significant change in rotation
			this.touchState.rotateInProgress = true;
			if (rotNew < 0) {
					this.move('rot_right', this.movement_speed/2);
			} else {
					this.move('rot_left', this.movement_speed/2);
			}
		}
		
	}
	this.gestureEnd = function(e) {
		e.preventDefault ();
		this.moveShouldStop = true;
		this.touchState.gestureInProgress = false;
		this.touchState.rotateInProgress = false;
	}	
//Touch Framework derived from https://github.com/alexyoung/turing.js/blob/master/turing.touch.js
	this.touchStart = function(e) {
		if (this.touchState.gestureInProgress) return;
		e.preventDefault ();
		var touches = e.changedTouches,
			first = touches[0],
			numtouches = touches.length;
	
		this.touchState.touches = e.touches;
		this.touchState.startTime  = (new Date).getTime();

		if (numtouches == 1) {
			this.touchState.x = e.changedTouches[0].clientX;
			this.touchState.y = e.changedTouches[0].clientY;		
		} else {
			var touch1 = e.changedTouches[0], touch2 = e.changedTouches[1];
			this.touchState.x = ((touch1.clientX + touch2.clientX) / 2);
			this.touchState.y = ((touch1.clientY + touch2.clientY) / 2);
		}
		this.touchState.startX = this.touchState.x;
		this.touchState.startY = this.touchState.y;
		this.touchState.target = e.target;
		this.touchState.duration = 0;
	}
	this.touchMove = function(e) {
		if (this.touchState.gestureInProgress) return;
		e.preventDefault ();

		var touches = e.changedTouches,
			first = touches[0],
			numtouches = touches.length;

		if (!this.touchState.gestureInProgress) {

			var objectClicked = this.objectAtScreenXY(e.changedTouches[0].pageX,e.changedTouches[0].pageY);
			if (objectClicked && objectClicked.object.planetid) {  //Check if it's a number of a planet
				planetWasClicked(objectClicked.object.planetid);
	//			div_info.innerHTML='Selected: '+objectClicked.name;
			}
		}

		if (numtouches == 1) {
			var moved = 0, touch = e.changedTouches[0];
			this.touchState.duration = (new Date).getTime() - this.touchState.startTime;
			this.touchState.x = this.touchState.startX - touch.pageX;
			this.touchState.y = this.touchState.startY - touch.pageY;
			moved = Math.sqrt((this.touchState.x * this.touchState.x) + (this.touchState.y * this.touchState.y));
		} else {
			//work with first two touches
			var moved = 0, touch1 = e.changedTouches[0], touch2 = e.changedTouches[1];
			this.touchState.duration = (new Date).getTime() - this.touchState.startTime;
			this.touchState.x = this.touchState.startX - ((touch1.pageX + touch2.pageX) / 2);
			this.touchState.y = this.touchState.startY - ((touch1.pageY + touch2.pageY) / 2);
			moved = Math.sqrt((this.touchState.x * this.touchState.x) + (this.touchState.y * this.touchState.y));

		}
//		div_info.innerHTML='time:'+this.touchState.duration+' moved:' + Math.round(moved) +' x:'+this.touchState.x+' y:'+this.touchState.y+'<br/>';
//		if (numtouches > 1) div_info.innerHTML+=' TWO<br/>';
	
		if (moved > 30) {
			//It's some sort of finger swipe
			if (this.touchState.duration > 200) { //A swipe has started
				this.touchState.gestureInProgress = true;
			}

			if (Math.abs(this.touchState.y) < 50) {
				//It's horizontal
				if (this.touchState.x > 0) {
					if (numtouches > 1) {
						this.swipeDoubleLeft(moved);
					} else {
						this.swipeLeft(moved);
					}
				} else {
					if (numtouches > 1) {
						this.swipeDoubleRight(moved);
					} else {
						this.swipeRight(moved);
					}
				}
			} else {
				//It's vertical
				if (this.touchState.y < 0) {
					if (numtouches > 1) {
						this.swipeDoubleDown(moved);
					} else {
						this.swipeDown(moved);
					}
				} else {
					if (numtouches > 1) {
						this.swipeDoubleUp(moved);
					} else {
						this.swipeUp(moved);
					}
				}
			}
		}

	}
	this.touchEnd = function(e) {
		var touches = e.changedTouches,
			first = touches[0],
			numtouches = touches.length;

		var x = e.changedTouches[0].clientX,
			y = e.changedTouches[0].clientY;

		this.touchState.gestureInProgress = false;

	
		if (this.touchState.x === x && this.touchState.y === y && this.touchState.touches.length == 1) {
			//From: http://ross.posterous.com/2008/08/19/iphone-touch-events-in-javascript	
			var simulatedEvent = document.createEvent("MouseEvent");
			simulatedEvent.initMouseEvent('mousedown', true, true, window, 1, 
									  first.screenX, first.screenY, 
									  first.clientX, first.clientY, false, 
									  false, false, false, 0/*left*/, null);
			first.target.dispatchEvent(simulatedEvent);
			event.preventDefault();

		}
		this.moveShouldStop = true;
	}

	this.rotateAroundPoint = function (angDist, axis) {
		// -pi < angDist < pi;
		angDist *= (Math.PI / 180);
		var cCamera = this.camera.position;
		var cTarget;
		if (this.targetObject)	{
			cTarget = this.camera.target.position;	
		} else {
			cTarget = {x:0, y:0, z:0};
		}
		var offsetX = cCamera.x - cTarget.x;
		var offsetY = cCamera.y - cTarget.y;
		var offsetZ = cCamera.z - cTarget.z;
		
 		switch(axis) {
		case 'x':
			rx = offsetX;
			ry = (offsetY * Math.cos(angDist)) - (offsetZ *Math.sin(angDist));
			rz = (offsetY * Math.sin(angDist)) + (offsetZ *Math.cos(angDist));
		  	break;
		case 'y':
			rx = (offsetX * Math.cos(angDist)) - (offsetZ *Math.sin(angDist));
			ry = offsetY;
			rz = (offsetX * Math.sin(angDist)) + (offsetZ *Math.cos(angDist));
		  	break;
		case 'z':
			rx = (offsetX * Math.cos(angDist)) - (offsetY *Math.sin(angDist));
			ry = (offsetX * Math.sin(angDist)) + (offsetY *Math.cos(angDist));
			rz = offsetZ;
		  	break;
		}
//		console.log(axis+":"+ cTarget.x+rx +", "+cTarget.y+ry +", "+cTarget.z+rz );
		return new THREE.Vector3( cTarget.x+rx, cTarget.y+ry, cTarget.z+rz );
	}

	this.move = function(type,length,message) {
		div_info.innerHTML= (message) ? message : "";
 		switch(type) {
		case 'rot_right':	this.camera.position=this.rotateAroundPoint(  length,'y');break;
		case 'rot_left':	this.camera.position=this.rotateAroundPoint(- length,'y');break;
		case 'rot_forward':	this.camera.position=this.rotateAroundPoint(  length,'x');break;
		case 'rot_back':	this.camera.position=this.rotateAroundPoint(- length,'x');break;
		case 'rot_up':		this.camera.position=this.rotateAroundPoint(  length,'z');break;
		case 'rot_down':	this.camera.position=this.rotateAroundPoint(- length,'z');break;
		case 'move_right':	this.camera.position.x-=length;break;  //TODO: Move perpendicular
		case 'move_left':	this.camera.position.x+=length;break;
		case 'move_forward':
			var distTo = this.camera.position.distanceTo(this.camera.target.position)
			if(distTo > (2*length)) {
				this.camera.position.addSelf(this.camera.target.position.clone().subSelf(this.camera.position).setLength(length));
			} else { //Very close
				if (distTo > 5+(this.camera.target.scale.x ? this.camera.target.scale.x : 1)) {
					this.camera.position.addSelf(this.camera.target.position.clone().subSelf(this.camera.position).setLength(length/10));
				} else {
					location.href= "http://wecreategames.com/apps/celestial/";
				}
			}
			break;
		case 'move_back':
			if(this.camera.position.distanceTo(this.camera.target.position) < option_SolarSystem3DSizeXZ) {
				this.camera.position.subSelf(this.camera.target.position.clone().subSelf(this.camera.position).setLength(length));
			}
			break;
		case 'move_up':		this.camera.position.y-=length;break;
		case 'move_down':	this.camera.position.y+=length;break;
		}
	}

	this.swipeRight = function(length) {
		this.move('rot_right', Math.sqrt(length), 'SWIPE RIGHT '+Math.round(length));
	}
	this.swipeLeft = function(length) {
		this.move('rot_left', Math.sqrt(length), 'SWIPE LEFT '+Math.round(length));
	}
	this.swipeUp = function(length) {
		this.move('rot_forward', Math.sqrt(length-30), 'SWIPE UP '+Math.round(length));
	}	
	this.swipeDown = function(length) {
		this.move('rot_back', Math.sqrt(length-30), 'SWIPE DOWN '+Math.round(length));
	}
	this.swipeDoubleRight = function(length) {
		this.move('rot_up', Math.sqrt(length-30), 'SWIPE DOUBLE RIGHT '+Math.round(length));
	}
	this.swipeDoubleLeft = function(length) {
		this.move('rot_down', Math.sqrt(length-30), 'SWIPE DOUBLE LEFT '+Math.round(length));
	}
	this.swipeDoubleUp = function(length) {
		this.move('move_up', length, 'SWIPE DOUBLE UP '+Math.round(length));
	}	
	this.swipeDoubleDown = function(length) {
		this.move('move_down', length, 'SWIPE DOUBLE DOWN '+Math.round(length));
	}
	this.rotateLeft = function() {
//		div_info.innerHTML+='ROTATE LEFT<br/>';
		this.camera.position.x+=this.moveDist;
	}
	this.rotateRight = function() {
//		div_info.innerHTML+='ROTATE RIGHT<br/>';
		this.camera.position.x-=this.moveDist;
	}
	this.scaleUp = function() {
//		div_info.innerHTML+='SCALE UP<br/>';
		this.camera.position.z+=(this.moveDist*3);		
	}
	this.scaleDown = function() {
//		div_info.innerHTML+='SCALE DOWN<br/>';
		this.camera.position.z-=(this.moveDist*3);
	}


	//----------------
	//From: http://ross.posterous.com/2008/08/19/iphone-touch-events-in-javascript
	//TODO: Remove?
	this.touchHandler = function(event) {
		var touches = event.changedTouches,
			first = touches[0],
			type = "";
			 switch(event.type)
		{
			case "touchstart": type="mousedown"; break;
			case "touchmove":  type="mousemove"; break;        
			case "touchend":   type="mouseup"; break;
			default: return;
		}
	
		//initMouseEvent(type, canBubble, cancelable, view, clickCount, 
		//           screenX, screenY, clientX, clientY, ctrlKey, 
		//           altKey, shiftKey, metaKey, button, relatedTarget);
		
		var simulatedEvent = document.createEvent("MouseEvent");
		simulatedEvent.initMouseEvent(type, true, true, window, 1, 
								  first.screenX, first.screenY, 
								  first.clientX, first.clientY, false, 
								  false, false, false, 0/*left*/, null);
	
		first.target.dispatchEvent(simulatedEvent);
		event.preventDefault();
	};	
	
	document.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	document.addEventListener( 'mousemove', bind( this, this.onDocumentMouseMove ), false );
	document.addEventListener( 'mousedown', bind( this, this.onDocumentMouseDown ), false );
	document.addEventListener( 'mouseup', bind( this, this.onDocumentMouseUp ), false );
	document.addEventListener( 'keydown', bind( this, this.onDocumentKeyDown ), false );
	document.addEventListener( 'keyup', bind( this, this.onDocumentKeyUp ), false );
	document.addEventListener( 'DOMMouseScroll', bind( this, this.onDocumentMouseScroll), false);
	document.addEventListener( 'mousewheel', bind( this, this.onDocumentMouseScroll), false);
    container.addEventListener( 'gesturestart', bind( this, this.gestureStart), false);
    container.addEventListener( 'gesturechange', bind( this, this.gestureChange), false);
    container.addEventListener( 'gestureend', bind( this, this.gestureEnd), false)
	container.addEventListener( 'touchstart', bind( this, this.touchStart), false);	
	container.addEventListener( 'touchmove', bind( this, this.touchMove), false);	
	container.addEventListener( 'touchend', bind( this, this.touchEnd), false);	
	container.addEventListener( 'touchcancel', bind( this, this.touchend), true); 
	
};
