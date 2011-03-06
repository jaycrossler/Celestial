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

CameraControlWASD = function ( camera, movement_speed, look_speed, nofly, look_vertical ) {

	this.movement_speed = movement_speed !== undefined ? movement_speed : 1.0;
	this.look_speed = look_speed !== undefined ? look_speed : 0.005;

	this.nofly = nofly;
	this.look_vertical = look_vertical;
	
	this.camera = camera;
	
	this.mouseX = 0;
	this.mouseY = 0;
	
	this.lat = 0;
	this.lon = 0;
	this.phy = 0;
	this.theta = 0;
	this.targetPlanet = 0;
	
	this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;
	this.moveUp = false;
	this.moveDown = false;
	this.moveShouldStop = false;
	this.windowHalfX = window.innerWidth / 2;
	this.windowHalfY = window.innerHeight / 2;

	this.onDocumentMouseDown = function ( event ) {
		
		event.preventDefault();

		//Look for what was clicked on
		var vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
		projector.unprojectVector( vector, camera );
		var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );
		var intersects = ray.intersectScene( scene );
		
//TODO: When planets are resized, they no longer are selectable in the scene
		var planetid;
		if ( intersects.length > 0 ) { //Test to make sure the clicked item is a planet
			for ( var i=0, l = intersects.length; i < l; i++ ) {
				planetid = intersects[ i ].object.planetid;
				if (typeof(planetid) == "number") break; //We found a valid planet
			}
		}
//TODO: Add a "clickable" attribute for things that can be clicked
		if (typeof(planetid) == "number") {  //Check if it's a number of a planet
			planetWasClicked(planetid);
		} else {
			//Planet not clicked, handle move instead
			if (option_ZoomOnClick) {
				event.stopPropagation();
				switch ( event.button ) {
					case 0: this.moveForward = true; break;
					case 2: this.moveBackward = true; break;		
				}
			}
		}


	};

	this.onDocumentMouseUp = function ( event ) {

		if (option_ZoomOnClick) {
			event.preventDefault();
			event.stopPropagation();

			switch ( event.button ) {
				case 0: this.moveForward = false; break;
				case 2: this.moveBackward = false; break;
			}
		}


	};

	this.onDocumentMouseMove = function (event) {
		if (option_PanScreenWithMouse) {
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
				this.moveUp = true;
			} else {
				this.moveDown = true;
			}
			this.moveShouldStop = true;
		}		
		if (event.preventDefault) event.preventDefault();
		event.returnValue = false;				
	};
	
	this.onDocumentKeyDown = function ( event ) {

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = true; break;

			case 43: /* + */
			case 187: /* = */ this.moveUp = true; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = true; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = true; break;

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

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = false; break;

			case 43: /* + */
			case 187: /* = */ this.moveUp = false; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = false; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = false; break;

			case 45: /* - */
			case 189: /* _ */ this.moveDown = false; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = false; break;
		}				
	};

	
	this.update = function() {
	
		if ( this.moveForward ) 	 {this.camera.position.y+=this.movement_speed; this.mouseY-=this.movement_speed;}
		if ( this.moveBackward ) {this.camera.position.y-=this.movement_speed; this.mouseY+=this.movement_speed;}
		if ( this.moveUp )  this.camera.translateZ( - this.movement_speed, this.nofly );
		if ( this.moveDown ) this.camera.translateZ(   this.movement_speed, this.nofly  );
		if ( this.moveLeft )     this.camera.translateX( - this.movement_speed, this.nofly  );
		if ( this.moveRight )    this.camera.translateX(   this.movement_speed, this.nofly  );

		if (this.moveShouldStop) { // stop moving if it was from scrolling
			this.moveForward = false; this.moveBackward = false;
		}
 
		this.lon += this.mouseX * this.look_speed;
		if( this.look_vertical ) this.lat -= this.mouseY * this.look_speed;

		this.lat = Math.max( - 85, Math.min( 85, this.lat ) );
		this.phi = ( 90 - this.lat ) * Math.PI / 180;
		this.theta = this.lon * Math.PI / 180;

// Previously was
//		this.camera.target.position.x = 100 * Math.sin( this.phi ) * Math.cos( this.theta ) + this.camera.position.x;
//		this.camera.target.position.y = 100 * Math.cos( this.phi ) + this.camera.position.y;
//		this.camera.target.position.z = 100 * Math.sin( this.phi ) * Math.sin( this.theta ) + this.camera.position.z;
// 
 				this.camera.position.x += (   this.mouseX - this.camera.position.x ) * this.look_speed;
 				this.camera.position.y += ( - this.mouseY - this.camera.position.y ) * this.look_speed;
 				
 				if (this.targetPlanet)	this.camera.target=this.targetPlanet;
		
	};

	this.gestureStart = function(e) {
		e.preventDefault ();
	}
	this.gestureChange = function(e) {
		var target = e.target;
		e.preventDefault ();
	
		if (e.scale > 0) {
			this.moveForward = true;
		} else {
			this.moveBackward = true;
		}
		this.moveShouldStop = true;  
	//        'rotate(' + (target.gStartRotation + e.rotation) + 'deg)';
	}
	this.gestureEnd = function(e) {
		e.preventDefault ();
	}	
	//----------------
	//From: http://ross.posterous.com/2008/08/19/iphone-touch-events-in-javascript
	//Intercepts iOs and Android touch events, turns into drag events
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

    container.addEventListener ('gesturestart', bind( this, this.gestureStart), false);
    container.addEventListener ('gesturechange', bind( this, this.gestureChange), false);
    container.addEventListener ('gestureend', bind( this, this.gestureEnd), false)
	container.addEventListener('touchstart', bind( this, this.touchHandler), false);	
	container.addEventListener('touchmove', bind( this, this.touchHandler), false);	
	container.addEventListener('touchend', bind( this, this.touchHandler), false);	
	container.addEventListener("touchcancel", bind( this, this.touchHandler), true); 
	window.addEventListener( 'resize', onWindowResize, false );
	
};
