Trucks = new Mongo.Collection("trucks");
Jobs = new Mongo.Collection("jobs");
Drivers = new Mongo.Collection("drivers");
Trailers = new Mongo.Collection("trailers");
Markers = {};

temp = {};

setInterval(function(){updateTrucksMarkers()}, 60000);


 updateTrucksMarkers = function () {
    Trucks.find().fetch().forEach(function (truck) {
        if(Markers[truck.id]){
            Markers[truck.id].setIcon(getIconPathForTruck(truck.id));
        }
    })
}

var allocateJob = function (id) {
    var job = Jobs.findOne({id: id});
    var truck = Trucks.findOne({id:Session.get("selectedTruckID")});
    var trailer = Trailers.findOne({id:truck.trailerId});
    var askForConfirm = "Do you really want to allocate the job " + job.id + " to the truck " + truck.name;
    var confirmText = 'The job ' + job.id + ' had been allocated to the truck: ' + truck.name;
    if (trailer.id || trailer.id == 0) {
        askForConfirm += " and the trailer " + trailer.name;
        confirmText += ' with the trailer: ' + trailer.name;
    }
    askForConfirm += " ?";
    confirmText += ".";
    (new PNotify({
        title: 'Confirmation Needed',
        text: askForConfirm,
        icon: 'glyphicon glyphicon-question-sign',
        hide: false,
        confirm: {
            confirm: true
        },
        buttons: {
            closer: false,
            sticker: false
        },
        history: {
            history: false
        }
    })).get().on('pnotify.confirm', function() {
        
        Jobs.update({_id:job._id},{$set:{trailerId:trailer.id, allocationTime:new Date(), truckId:truck.id}})
        new PNotify({
            title: 'Allocated',
            text: confirmText,
            type: 'success'
        });
    }).on('pnotify.cancel', function() {
        new PNotify({
            title: 'Allocation cancelled',
            type: 'error'
        });
    });
}

var showDetails = function(id) {
    // Session.set("selectedID", id);
    
    if(Session.get("selectedID") || Session.get("selectedID") == 0)
      if(Markers[Session.get("selectedID")]) 
        Markers[Session.get("selectedID")].setIcon("/img/red-dot.png");
    Session.set("selectedID",id);
    Markers[id].setIcon(getIconPathForTruck(id));
}

var getIconPathForTruck = function(truckId){
    if(Session.get("selectedID") || Session.get("selectedID") == 0){
        if(Session.get("selectedID") == truckId){
            return "/img/yellow-dot.png";
        }
    }

    var truck = Trucks.findOne({id:truckId});
    var path ="/img/red-dot.png";
    var limit = new Date(new Date() - 15*60000);
    var last = truck.outstandingSince;
    if(last.getTime() > limit.getTime()){
       return "/img/blue-dot.png";
    }else{
        return "/img/red-dot.png";
    }
}

var endDayForTruck = function(truckId) {
    if(truckId != null){
        var truck=Trucks.findOne({id: truckId});
        (new PNotify({
            title: "Sending the truck #"+truck.name+" to his base",
            text: "Are you sure you want to end the day for this truck ?",
            confirm: {
                confirm: true
            }
        })).get().on('pnotify.confirm', function(){
            Trucks.update({_id:truck._id},{$set:{sentToHisBaseOn:new Date()}});
            new PNotify({
                title: "Success",
                text: "The truck #"+truck.name+" has been sent to his base successfully",
                type: 'success'
            })
        }).on('pnotify.cancel', function(){
            new PNotify({
                title: "Info",
                text: "Aborted",
                type: 'info'
            })
        });
    }else{
        (new PNotify({
            title: "Sending all truck to their base",
            text: "Are you sure you want to end the day for all trucks ?",
            confirm: {
                confirm: true
            }
        })).get().on('pnotify.confirm', function(){
            new PNotify({
                title: "Success",
                text: "All trucks has been sent to their base successfully",
                type: 'success'
            })
        }).on('pnotify.cancel', function(){
            new PNotify({
                title: "Info",
                text: "Aborted",
                type: 'info'
            })
        });
    }   
}

var getNotFreeTrucksIds = function() {
    var ids = [];
    var todayMidnight = new Date().setHours(0,0,0,0);
    
    Jobs.find({truckId:{$ne:null}, completionTime:null},{truckId:1}).forEach(function(job){ids.push(job.truckId)});
    Trucks.find({sentToHisBaseOn:{$gte: new Date(todayMidnight)}}).forEach(function(truck){ids.push(truck.id)});
    return ids;
}

if (Meteor.isClient) {
    Meteor.startup(function() {
        GoogleMaps.load();

        Jobs.find().observe(
        {
          changed:function(newJob, oldJob){
              if(oldJob.truckId != newJob.truckId)
              {
                  Markers[newJob.truckId].setMap(null);

                  // Clear the event listener
                  google.maps.event.clearInstanceListeners(Markers[newJob.truckId]);

                  // Remove the reference to this marker instance
                  delete Markers[newJob.truckId];
              }
          }
        })
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
                added: function(truck) {
                    // console.log("add",truck,getNotFreeTrucksIds(),getNotFreeTrucksIds().indexOf(truck.id));
                    if(getNotFreeTrucksIds().indexOf(truck.id) == -1 ){
                        
                        //define if the truck is new or not
                        var path = getIconPathForTruck(truck.id);

                        // Create a marker for this truck
                        var marker = new google.maps.Marker({
                            position: new google.maps.LatLng(truck.lastLocation.coordinate.lat, truck.lastLocation.coordinate.lng),
                            map: map.instance,
                            id: truck.id,
                            icon:path
                        });

                        google.maps.event.addListener(marker, 'click', function() {
                            showDetails(marker.id);
                        });

                        google.maps.event.addListener(marker, 'dblclick', function() {
                            endDayForTruck(marker.id);
                        });

                        // Store this marker instance within the Markers object.
                        Markers[truck.id] = marker;
                    }
                },

                changed: function(newTruck, oldTruck) {
                    if(getNotFreeTrucksIds().indexOf(newTruck.id) == -1 ){
                        Markers[newTruck.id].setPosition({ lat: newTruck.lastLocation.coordinate.lat, lng: newTruck.lastLocation.coordinate.lng });
                    }else{
                        this.removed(newTruck);
                    }
                },

                removed: function(oldTruck) {
                    // console.log("rm",oldTruck,getNotFreeTrucksIds(),getNotFreeTrucksIds().indexOf(oldTruck.id));
                    if(getNotFreeTrucksIds().indexOf(oldTruck.id) != -1 ){
                        // Remove the marker from the map
                        Markers[oldTruck.id].setMap(null);

                        // Clear the event listener
                        google.maps.event.clearInstanceListeners(Markers[oldTruck.id]);

                        // Remove the reference to this marker instance
                        delete Markers[oldTruck.id];
                    }
                }
            });
        });
    });
    Template.leftPart.helpers({
        trucks: function() {
            var ids = []
            var todayMidnight = new Date().setHours(0,0,0,0);
            Jobs.find({truckId:{$ne:null}, completionTime:null},{truckId:1}).forEach(function(job){ids.push(job.truckId)});
            Trucks.find({sentToHisBaseOn:{$gte: new Date(todayMidnight)}}).forEach(function(truck){ids.push(truck.id)});;

            return Trucks.find({id:{$nin:ids}});
        }
    });
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
        },
        isRefSet: function() {   
            if(this.referenceNumber != null && this.referenceNumber.length > 0)
                return true;
            return false;
        }
    })
    Template.jobItem.events({
        "click .jobItem": function() {
            if(arguments[0].altKey){
                allocateJob(this.id);
            }
        }
    })
    Template.rightPart.helpers({
        jobs: function() {
            return (Session.get("selectedTruckID") || Session.get("selectedTruckID") == 0)?getSortedJobForTruck(Session.get("selectedTruckID")):[];
        }
    });
    Template.selectedTruck.helpers({
        selectedTruck: function() {
            return Trucks.findOne({id:Session.get("selectedTruckID")});
        },
        driver: function() {
            return Drivers.findOne({id:Trucks.findOne({id:Session.get("selectedTruckID")}).driverId});
        },
        trailer: function() {    
            return Trailers.findOne({id:Trucks.findOne({id:Session.get("selectedTruckID")}).trailerId});
        }
    });
    Template.truckItem.helpers({
        selected: function() {
            return (Session.get("selectedTruckID") || Session.get("selectedTruckID") == 0) && this.id == Session.get("selectedTruckID");
        },
        driver: function() {
            return Drivers.findOne({id:this.driverId});
        },
        trailer: function() {    
            return Trailers.findOne({id:this.trailerId});
        }
    });
    Template.truckItem.events({
        "click .truckItem": function() {
            if(arguments[0].altKey){
                endDayForTruck(this.id);
            }else{
                showDetails(this.id);
            }
        },
        "dblclick .truckItem": function() {
        }
    });

    function getSortedJobForTruck(truckId) {
        var truck = Trucks.findOne({id: truckId})
        var recommendedJobs = Jobs.find({recommendedTruck:truck.id}).fetch();
        var outstandingJobs = Jobs.find({allocationTime:null}).fetch();
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
            return (jobx.isRecommended && joby.isRecommended) ? 0 : (jobx.isRecommended) ? -1 : (joby.isRecommended) ? 1 : jobx.distance - joby.distance;
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
            case "delivery":
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

