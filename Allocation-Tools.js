Trucks = new Mongo.Collection("trucks");
Jobs = new Mongo.Collection("jobs");
Markers = new Mongo.Collection('markers');

if (Meteor.isClient) {

  Meteor.startup(function() {  
    GoogleMaps.load();
  });

  Template.map.helpers({  
    mapOptions: function() {
      if (GoogleMaps.loaded()) {
        return {
          center: new google.maps.LatLng(57.140682, -2.106124),
          zoom: 9,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
      }
    }
  });

  Template.map.onCreated(function() {
    GoogleMaps.ready('map', function(map) {

      var markers = {};

      Trucks.find().observe({
        added: function(document) {
          // Create a marker for this document
          var marker = new google.maps.Marker({
            position: new google.maps.LatLng(document.location.lat, document.location.lng),
            map: map.instance,
            truckID: document.id,
            id: document._id
          });

          google.maps.event.addListener(marker, 'click', function() {
            Meteor.call("showDetails",marker.truckID);
          });

          // Store this marker instance within the markers object.
          markers[document._id] = marker;
        },

        changed: function(newDocument, oldDocument) {
          markers[newDocument._id].setPosition({ lat: newDocument.lat, lng: newDocument.lng });
        },

        removed: function(oldDocument) {
          // Remove the marker from the map
          markers[oldDocument._id].setMap(null);

          // Clear the event listener
          google.maps.event.clearInstanceListeners(markers[oldDocument._id]);

          // Remove the reference to this marker instance
          delete markers[oldDocument._id];
        }
      });

    });
  });

  Template.leftPart.helpers(
  {
    trucks: function () {
      return Trucks.find();
    }
  });

  Template.jobItem.helpers({
    formattedDate:function(){
      console.log(moment(this.earliestCol.time).format('DD-MM-YYYY'));
      return moment(this.earliestCol.time).format('DD-MM-YYYY');
    }
  })

  Template.rightPart.helpers(
  {
    jobs: function(){
      return Session.get("recommendedJobs");
    }
  });

  Template.selectedTruck.helpers(
  {
    selectedTruck: function () {
      return Session.get("selectedTruck");
    }
  });

  Template.truckItem.events(
  {
    "click .truckItem": function(){
      Meteor.call("showDetails",this.id);
    }
  });

  Meteor.methods({
    showDetails: function(id){
      Session.set("selectedTruck",Trucks.findOne({id:id}));
      Session.set("recommendedJobs", Jobs.find().fetch());
    }
  })

}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}


UI.registerHelper('formatTime', function(context, options) {
  console.log(context);
  if(context)
    return moment(context).fromNow();
});