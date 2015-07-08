Trucks = new Mongo.Collection("trucks");
Jobs = new Mongo.Collection("jobs");
Markers = {};


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

            

            Trucks.find().observe({
                added: function(document) {
                    // Create a marker for this document
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(document.location.lat, document.location.lng),
                        map: map.instance,
                        id: document.id,
                        icon: "/img/red-dot.png"
                    });

                    google.maps.event.addListener(marker, 'click', function() {
                        Meteor.call("showDetails", marker.id);
                    });

                    // Store this marker instance within the Markers object.
                    Markers[document.id] = marker;
                },

                changed: function(newDocument, oldDocument) {
                    Markers[newDocument.id].setPosition({
                        lat: newDocument.lat,
                        lng: newDocument.lng
                    });
                },

                removed: function(oldDocument) {
                    // Remove the marker from the map
                    Markers[oldDocument.id].setMap(null);

                    // Clear the event listener
                    google.maps.event.clearInstanceListeners(Markers[oldDocument.id]);

                    // Remove the reference to this marker instance
                    delete Markers[oldDocument.id];
                }
            });

        });
    });

    Template.leftPart.helpers({
        trucks: function() {
            return Trucks.find();
        }
    });

    Template.jobItem.helpers({
        formattedDate: function() {
            console.log(moment(this.earliestCol.time).format('DD-MM-YYYY'));
            return moment(this.earliestCol.time).format('DD-MM-YYYY');
        }
    })

    Template.jobItem.events({
        "dblclick .jobItem": function() {
            Meteor.call("allocateJob", this.id);
        }
    })

    Template.rightPart.helpers({
        jobs: function() {
            return Session.get("recommendedJobs");
        }
    });

    Template.selectedTruck.helpers({
        selectedTruck: function() {
            return Session.get("selectedTruck");
        }
    });

    Template.truckItem.helpers({
        selected: function() {
            return Session.get("selectedTruck") && this.id == Session.get("selectedTruck").id;
        }
    });

    Template.truckItem.events({
        "click .truckItem": function() {
            Meteor.call("showDetails", this.id);
        },
        "dblclick .truckItem": function() {
            Meteor.call("endDayForTruck", this.id);
        }
    });

    Meteor.methods({
        allocateJob: function (id) {
            allocateJob(id);
        },
        showDetails: function(id) {
            Session.set("selectedTruck", Trucks.findOne({id: id}));
            Session.set("recommendedJobs", getSortedJobForTruck(id));
            
            if(Session.get("selectedID"))
              Markers[Session.get("selectedID")].setIcon("/img/red-dot.png");

            Markers[id].setIcon("/img/yellow-dot.png");
            Session.set("selectedID",id);        
        },
        endDayForTruck: function(id) {
            endDayForTruck(id);
        }
    })

    function getSortedJobForTruck(truckId) {
        var truck = Trucks.findOne({id: truckId})
        var recommendedJobs = Jobs.find().fetch(); //get recommended jobs for that truck
        var outstandingJobs = Jobs.find().fetch(); //all outstandings jobs


        outstandingJobs.forEach(function(job) {
            recommendedJobs.forEach(function(jobR) {
                if (jobR.id == job.id) {
                    job.isRecommended = true;
                }
            });

            job.truckSelectedName = truck.name;
            var dist = getStraigthDistanceBetweenLocations({
                lat: job.latestDel.location.lat,
                lon: job.latestDel.location.long
            }, {
                lat: truck.location.lat,
                lon: truck.location.lng
            });
            var km = dist.toString().split(".")[0];
            var m = dist.toString().split(".")[1];
            if (m) {
                m = "." + m.substring(0, 3);
            } else {
                m = ".0";
            }
            job.distance = km + m;
        });



        var sortedJobs = outstandingJobs.sort(function(jobx, joby) {
            return (jobx.recommended && joby.recommended) ? 0 : (jobx.recommended) ? -1 : (joby.recommended) ? 1 : jobx.distance - joby.distance;
        });

        return sortedJobs;
    }

    function getStraigthDistanceBetweenLocations(loc1, loc2) {
        var dist = 0.0;
        var lon1 = (loc1.lon * Math.PI) / 180;
        var lon2 = (loc2.lon * Math.PI) / 180;
        var lat1 = (loc1.lat * Math.PI) / 180;
        var lat2 = (loc2.lat * Math.PI) / 180;
        var R = 6373;
        dist = Math.acos((Math.sin(lat1) * Math.sin(lat2)) + (Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2))) * R;
        return dist;
    }

    function allocateJob(jobId) {
        var job=Jobs.findOne({id: jobId});
        new PNotify({
            title: 'allocate job #'+job.id,
            text: "don't forget to implement that",
            hide: false
        });
    };

    function endDayForTruck (truckId) {
        if(truckId != null){
            var truck=Trucks.findOne({id: truckId});
            new PNotify({
                title: 'end day for truck #'+truck.id,
                text: "don't forget to implement that",
                hide: false
            });
        }else{
            new PNotify({
                title: 'end day for all truck',
                text: "don't forget to implement that",
                hide: false
            });
        }   
    }

}

if (Meteor.isServer) {
    Meteor.startup(function() {
        // code to run on server at startup
    });
}

UI.registerHelper('formatTime', function(context, options) {
    if (context)
        return moment(context).fromNow();
});