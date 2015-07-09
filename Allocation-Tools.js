Trucks = new Mongo.Collection("trucks");
Jobs = new Mongo.Collection("jobs");
Drivers = new Mongo.Collection("drivers");
Trailers = new Mongo.Collection("trailers");
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
                        position: new google.maps.LatLng(document.lastLocation.lat, document.lastLocation.lng),
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

    Template.truckItem.helpers({
        driver: function() {
            return Drivers.findOne({id:this.driverId});
        },
        trailer: function() {    
            return Trailers.findOne({id:this.trailerId});
        }
    })

    Template.jobItem.helpers({
        truck: function() {
            return Trucks.findOne({id:this.truckId});
        },
        trailer: function() {    
            return Trailers.findOne({id:this.trailerId});
        },
        earliestStep: function() {
            return this.steps[0];
        },
        latestStep: function() {    
            return this.steps[this.steps.length - 1];
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
        },
        driver: function() {
            return Drivers.findOne({id:Session.get("selectedTruck").driverId});
        },
        trailer: function() {    
            return Trailers.findOne({id:Session.get("selectedTruck").trailerId});
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
                lat: job.steps[0].location.coordinate.lat,
                lng: job.steps[0].location.coordinate.lng
            }, {
                lat: truck.lastLocation.coordinate.lat,
                lng: truck.lastLocation.coordinate.lng
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
        var lng1 = (loc1.lng * Math.PI) / 180;
        var lng2 = (loc2.lng * Math.PI) / 180;
        var lat1 = (loc1.lat * Math.PI) / 180;
        var lat2 = (loc2.lat * Math.PI) / 180;
        var R = 6373;
        dist = Math.acos((Math.sin(lat1) * Math.sin(lat2)) + (Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng1 - lng2))) * R;
        
        return dist;
    }

    function allocateJob(jobId) {
        var job=Jobs.findOne({id: jobId});
        new PNotify({
            title: 'allocate job #'+job.id,
            text: "don't forget to implement that",
            hide: false,
            buttons: {
                sticker: false
            }
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
                hide:false
            });
        }   
    }

}


if (Meteor.isServer) {
    Meteor.startup(function() {
        // code to run on server at startup
    });
}

UI.registerHelper('stepToString', function(context, options) {
    if (context){
        switch(context.type) {
            case "takeTrailer":
                return "Take trailer at ";
            case "dropOffTrailer":
                return "Drop off the trailer at ";
            case "collection":
                return "Collect at ";
            case "deliver":
                return "Deliver at ";
            case "moveTo":
                return "Move to ";
            default: return context.type;
        }
    }
});

UI.registerHelper('formatTime', function(context, options) {
    if (context)
        return moment(context).fromNow();
});