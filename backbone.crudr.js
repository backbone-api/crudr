(function(Backbone, _){

var origSync = Backbone.sync;

var Helpers = {
	// Backbone.js support
	// Listen for backend notifications and update the
	// collection models accordingly.

	bindBackend: function() {
		var self = this;

		if( ( typeof(this.model) == "undefined" ) ) {
			// this is a model
			this.backend.ready(function() {
				var event = self.backend.options.event;

				self.bind(event + ':create', function(response) {
					self.parse(response);
				});
				self.bind(event + ':update', function(attributes) {
					self.set(attributes);
				});
				self.bind(event + ':delete', function() {
					self.destroy();
				});
			});


		} else {
			// this is a collection

			//var idAttribute = ( typeof(this.model) == undefined ) ? this.prototype.idAttribute : this.model.prototype.idAttribute;
			var idAttribute = this.model.prototype.idAttribute || this.prototype.idAttribute;

			this.backend.ready(function() {
				var event = self.backend.options.event;

				self.bind(event + ':create', function(model) {
					self.add(model);
				});
				self.bind(event + ':update', function(model) {
					var item = self.get(model[idAttribute]);
					if (item) item.set(model);
				});
				self.bind(event + ':delete', function(model) {
					self.remove(model[idAttribute]);
				});
			});

		}
	}
};


function inherit(Parent, Child, mixins) {
	var Func = function() {};
	Func.prototype = Parent.prototype;

	mixins || (mixins = [])
	mixins.forEach(function(mixin) {
		_.extend(Func.prototype, mixin);
	});

	Child.prototype = new Func();
	Child.prototype.constructor = Child;

	return _.extend(Child, Parent);
};

function extend(Parent) {
	// Override the parent constructor

	var Child = function() {
		if (this.backend) {
			this.backend = crudr.subscribe({
				el : this,
				name : this.backend
			});
			// setup events
			this.bindBackend();
		}

		Parent.apply(this, arguments);
	};

	// Inherit everything else from the parent
	return inherit(Parent, Child, [Helpers]);
};

Backbone.sync = function(method, model, options) {
	var backend = model.backend || (model.collection && model.collection.backend);

	if(backend && backend.ready ) {
		// we have sockets...
		var error = options.error || function() {};
		var success = options.success || function() {};

		// Don't pass the callbacks to the backend
		delete options.error;
		delete options.success;

		// Use CRUDr backend
		backend.ready(function() {
			var req = {
				name: backend.name,
				method: method,
				model: model.toJSON(),
				options: options
			};

			crudr.sync(req, { error: error, success: success } );

		});

	} else if( backend ) {
		// edge case when the sync is loaded before the initialization of the backend is complete
		setTimeout(function(){
			Backbone.sync(method, model, options);
		}, 200);
	} else {
		// no sockets...
		// Call the original Backbone.sync
		origSync(method, model, options);
	}
};

Backbone.Collection = (extend)(Backbone.Collection);

Backbone.Model = (extend)(Backbone.Model);

return Backbone;

})(Backbone, _);
