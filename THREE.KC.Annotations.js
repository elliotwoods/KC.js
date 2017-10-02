class Annotation {
	constructor(text, objectWithPosition) {
		this.text = text;
		this.posScreen = new THREE.Vector2();
		this.objectWithPosition = objectWithPosition;
		this.visible = true;

		this.domElementID = 'annotation-' + Annotation.getNextIndex();
		$("#annotations").append('<div class="annotation" id="' + this.domElementID + '">' + text + '</div>');
		this.domElement = $("#" + this.domElementID);
		this.domElement.css({position : 'absolute'});
	}

	destroy() {
		this.domElement.remove();
	}

	update() {
		var posP = this.objectWithPosition.position.clone().project(camera);
		this.posScreen.x = (posP.x + 1.0) / 2.0 * renderSize.width;
		this.posScreen.y = (1.0 - posP.y) / 2.0 * renderSize.height;
		var visible = this.visible && posP.z < 1 && Math.abs(posP.x) < 1 && Math.abs(posP.y) < 1;

		this.domElement.html(this.text);
		this.domElement.css({
			left : this.posScreen.x,
			top : this.posScreen.y,
			overflow : 'hidden',
			visibility : visible ? 'visible' : 'hidden'
		});
	}
}

Annotation.getNextIndex = function() {
	return Annotation.nextIndex++;
}
Annotation.nextIndex = 0;

class Annotations {
	constructor() {
		this.annotations = [];
	}

	push(annotation) {
		this.annotations.push(annotation);
	}

	update() {
		this.annotations.forEach(function(annotation) {
			annotation.update();
		});
	}
}
var annotations = new Annotations();