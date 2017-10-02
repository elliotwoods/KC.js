class SceneObject {
	constructor() {
		this.dirty = false;
		this.doc = null;
	}

	update() {
		if(this.dirty) {
			this.rebuild();
			this.dirty = false;
		}
	}

	refresh() {
		$.ajax({
			url: this.getURL
		}).then($.proxy(function (responseText) {
			var response = JSON.parse(responseText);
			if(response.success) {
				this.doc = response.data;
				this.dirty = true;
			}
			else {
				showError(response);
			}
		}, this));
	}

	commit(successCallback, failCallback) {
		$.ajax({
			type: "POST",
			url: this.setURL,
			data: JSON.stringify(this.doc),
			contentType: "application/json; charset=utf-8",
			crossDomain: true,
			dataType: "json",
			success: $.proxy(function (response, status, jqXHR) {
				if(response.success) {
					if(typeof successCallback != "undefined") {
						successCallback();
					}
					this.refresh();
					sceneObjects.rebuildInspector();
				}
				else {
					if(typeof failCallback != "undefined") {
						failCallback();
					}
					showError(response);
				}
			}, this),
	
			error: function (jqXHR, status) {
				var errorInfo = {
					success : false,
					error : 'Commit failed [' + jqXHR.statusText + ']',
					traceback : jqXHR.responseText
				}
				if(typeof failCallback != "undefined") {
					failCallback();
				}
				showError(errorInfo);
			}
		 });
	}
}

class SceneObjects {
	constructor(inspectorContainer) {
		this.sceneObjects = [];
		this.hover = null;
		this.selection = [];
		this.selectionBounds = new THREE.Box3();
		
		this.inspectorContainer = inspectorContainer;
		this.inspectorDirty = true;
		
		//selectionCursors
		{
			this.selectionCursors = [];
			this.selectionCursorsDirty = true;
			this.selectionCursorGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
			this.selectionCursorMaterial = new THREE.MeshBasicMaterial({color : 0x333333, wireframe: true});
		}
		
		//hoverCursor
		{
			var geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
			var material = new THREE.MeshBasicMaterial({color : 0xaaaaaa, wireframe : true});
			this.hoverCursor = new THREE.Mesh(geometry, material);
			this.hoverCursor.visible = false;
			this.hoverCursor.renderOrder = -1;
			scene.add(this.hoverCursor);
		}

		//jsonEditor
		{
			this.jsonEditor = new JsonEditorREST()
		}

		//refresh button
		{
			$("#refreshButton").click($.proxy(function() {
				this.refresh();
			}, this));
		}
	}

	update() {
		this.sceneObjects.forEach(function(sceneObject) {
			sceneObject.update();
		}, this);

		if(this.selectionCursorsDirty) {
			this.rebuildSelectionCursors();
		}

		if(this.inspectorDirty) {
			this.rebuildInspector();
		}
	}

	push(sceneObject) {
		this.sceneObjects.push(sceneObject);
	}

	updateHover(rayCaster) {
		this.hover = null;
		this.sceneObjects.forEach(function(sceneObject) {
			if(sceneObject.intersects(rayCaster)) {
				this.hover = sceneObject;
			}
		}, this);

		if(this.hover == null) {
			this.hoverCursor.visible = false;
		}
		else {
			var bounds = this.hover.getBoundingBox().clone();
			/*
			var expandedBounds = new THREE.Box3();
			expandedBounds.setFromCenterAndSize(bounds.getCenter(), bounds.getSize().clone().addScalar(0.05));

			this.hoverCursor.scale.copy(expandedBounds.getSize());
			this.hoverCursor.position.copy(expandedBounds.getCenter());
			*/
			this.hoverCursor.scale.copy(bounds.getSize());
			this.hoverCursor.position.copy(bounds.getCenter());

			this.hoverCursor.visible = true;
		}
	}

	mouseDown(eventArguments) {
		this.mouseDownArguments = eventArguments;
	}

	mouseUp(eventArguments) {
		//only listen for first button
		if(eventArguments.button != 0) {
			return;
		}
		
		//if mouse moved ignore it
		if(eventArguments.x != this.mouseDownArguments.x
		|| eventArguments.y != this.mouseDownArguments.y) {
			return;
		}

		if(!eventArguments.shiftKey) {
			this.clearSelection();
		}
		if(this.hover != null) {
			if($.inArray(this.hover, this.selection) == -1) {
				this.selection.push(this.hover);
			}
		}

		this.selectionCursorsDirty = true;
		this.inspectorDirty = true;
	}

	clearSelection() {
		this.selection = [];
		this.inspectorDirty = true;
	}
	
	rebuildSelectionCursors() {
		this.selectionCursors.forEach(function(selectionCursor) {
			scene.remove(selectionCursor);
		});
		this.selectionCursors = [];

		this.selection.forEach($.proxy(function(selectionItem) {
			var bounds = selectionItem.getBoundingBox();
			var mesh = new THREE.Mesh(this.selectionCursorGeometry, this.selectionCursorMaterial);
			mesh.scale.copy(bounds.getSize());
			mesh.position.copy(bounds.getCenter());

			this.selectionCursors.push(mesh);
			scene.add(mesh);
		}, this));

		if(this.selection.length > 1) {
			var outerBounds = this.selection[0].getBoundingBox();
			for(var i=1; i<this.selection.length; i++) {
				var selectionItem = this.selection[i];
				var boundsOther = selectionItem.getBoundingBox();
				outerBounds.expandByPoint(boundsOther.min);
				outerBounds.expandByPoint(boundsOther.max);
			}

			this.selectionBounds = outerBounds;

			outerBounds.expandByScalar(0.1);

			var mesh = new THREE.Mesh(this.selectionCursorGeometry, this.selectionCursorMaterial);
			mesh.scale.copy(outerBounds.getSize());
			mesh.position.copy(outerBounds.getCenter());
			mesh.selectionItem = selectionItem;

			this.selectionCursors.push(mesh);
			scene.add(mesh);
		}
		else if (this.selection.length == 1) {
			this.selectionBounds = this.selection[0].getBoundingBox();
		}


		this.selectionCursorsDirty = false;
	}

	rebuildInspector() {
		this.inspectorContainer.innerHTML = "";
		if(this.selection.length == 1) {
			//single selection
			var sceneObject = this.selection[0];
			document.getElementById("sceneObjectName").innerHTML = sceneObject.constructor.name;
			
			if ('doc' in sceneObject) {
				this.jsonEditor.setup(sceneObject, this.inspectorContainer);
				//also needs code for commit and refresh
			}
			sceneObject.inspect(this.inspectorContainer);

			this.checkMultipleSelection();
			$("#refreshButtonText").text("Refresh")
		}
		else if(this.selection.length > 1) {
			//multiple selection
			this.checkMultipleSelection();			
			$("#refreshButtonText").text("Refresh [" + this.selection.length + "]")
		}
		else {
			//no selection
			document.getElementById("sceneObjectName").innerHTML = "Inspector";
			this.inspectorContainer.innerHTML = "";
			$("#refreshButtonText").text("Refresh All")
		}
		this.inspectorDirty = false;
	}

	checkMultipleSelection() {
		multipleSelectionHandlers.forEach(function(multipleSelectionHandler) {
			if(multipleSelectionHandler.handlesSet(this.selection)) {
				multipleSelectionHandler.setupSuper(this.inspectorContainer, this.selection);
			}
		}, this);
	}	

	doubleClick() {
		if(this.selection.length > 0) {
			camera.tweenEndTarget = new THREE.Vector3();
			camera.tweenEndTarget.copy(this.selectionBounds.getCenter());

			this.cameraTween = new TWEEN.Tween(controls.target).to({
				x: camera.tweenEndTarget.x,
				y: camera.tweenEndTarget.y,
				z: camera.tweenEndTarget.z
			}).easing(TWEEN.Easing.Linear.None).onUpdate(function () {
			}).onComplete(function () {
			}).start();
		}
	}

	refresh() {
		if(this.selection.length > 0) {
			this.selection.forEach(function(item) {
				item.refresh();
			});
		}
		else {
			this.sceneObjects.forEach(function(item) {
				item.refresh();
			});
		}
	}
}

class MultipleSelectionHandler {
	constructor() {
		this.collection = [];
	}

	handlesSet(set) {
		var success = true;
		set.forEach(function(element) {
			if(!this.handlesType(element)) {
				success = false;
				return;
			}
		}, this);
		return success;
	}

	setupSuper(inspector, set) {
		this.inspector = inspector;
		this.collection = set;
		this.setup(inspector);
	}
}

var multipleSelectionHandlers = new Array();