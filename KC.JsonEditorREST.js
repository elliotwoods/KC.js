class JsonEditorREST {
	constructor() {
		this.sceneObject = null;

		//container
		{
			this.div = jQuery('<div/>', {
				id : 'jsonEditorContainer',
				style: 'width: 100%'
			})
		}

		{
			this.jsonEditor = new JSONEditor(this.div[0], {
				modes : ['tree', 'code']
				, onChange : $.proxy(this.onChange, this)
			});

			this.jsonEditor.setName('document');
		}

		{
			this.commitButton = $('<button/>',
			{
				id: 'jsonEditorCommit',
				text: 'Commit',
				class: 'btn btn-default btn-block success fade',
				style: '',
				href: '#'
			});
			this.commitButton.click($.proxy(this.commit, this));
			this.commitButton.appendTo(this.div);
		}
	}

	setup(sceneObject, container) {
		this.jsonEditor.set(sceneObject.doc);
		this.div.appendTo(container);
		this.sceneObject = sceneObject;
		if('setURL' in this.sceneObject) {
			this.commitButton.show();
		}
		else {
			this.commitButton.hide();
		}
		this.commitButton.removeClass("btn-success");
	}

	commit() {
		this.commitButton.addClass("disabled");
		this.sceneObject.doc = this.jsonEditor.get();
		this.sceneObject.commit($.proxy(function() {
			this.commitButton.addClass("btn-success fade");
		}, this), $.proxy(function() {
			this.commitButton.removeClass("disabled");
		}, this));
	}

	onChange() {
		this.commitButton.removeClass("disabled fade btn-success");
	}
}
