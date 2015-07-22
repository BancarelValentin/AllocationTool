Trucks = new Mongo.Collection("trucks");
Jobs = new Mongo.Collection("jobs");
Drivers = new Mongo.Collection("drivers");
Trailers = new Mongo.Collection("trailers");
Markers = {};

temp = {};

// setInterval(function(){updateTrucksMarkers()}, 10000);


  updateTrucksMarkers = function () {

    var trucks = Trucks.find({_id: { $nin: getNotFreeTrucksIds()}}).fetch();
    console.log(trucks)
    trucks.forEach(function (truck) {
        var newPath = getIconPathForTruck(truck._id);
        if(Markers[truck._id]  && Markers[truck._id].icon != newPath){
            Markers[truck._id].setIcon(newPath);
        }
    })
}

var allocateJob = function (_id) {
    var job = Jobs.findOne({_id: _id});
    var truck = Trucks.findOne({_id:Session.get("selectedID")});
    var trailer = Trailers.findOne({_id:truck.trailerId});
    var askForConfirm = "Do you really want to allocate the job " + job._id + " to the truck " + truck.name;
    var confirmText = 'The job ' + job._id + ' had been allocated to the truck: ' + truck.name;
    if (trailer._id) {
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
        
        Jobs.update({_id:job._id},{$set:{trailerId:trailer._id, allocationTime:new Date(), truckId:truck._id}})
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

var showDetails = function(_id) {
    console.log(Trucks.findOne({_id : _id}));
    console.log(Jobs.find({truckId : _id}).fetch());
    if(Session.get("selectedID")){
        var previousSelected = Session.get("selectedID");
    }
    
    Session.set("selectedID",_id);

    if(Markers[previousSelected]){
        Markers[previousSelected].setIcon(getIconPathForTruck(previousSelected));
        Markers[previousSelected].setZIndex();
    }

    Markers[_id].setIcon(getIconPathForTruck(_id));
    Markers[_id].setZIndex(999999);
}

var getIconPathForTruck = function(truckId){
    if(Session.get("selectedID")){
        if(JSON.stringify(Session.get("selectedID")) == JSON.stringify(truckId)){
            return "/img/yellow-dot.png";
        }
    }

    var truck = Trucks.findOne(truckId);
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
        var truck=Trucks.findOne({_id: truckId});
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
    
    Jobs.find({truckId:{$ne:null}, completionTime:null, cancellationTime:null}).forEach(function(job){ids.push(job.truckId)});
    Trucks.find({sentToHisBaseOn:{$gte: new Date(todayMidnight)}}).forEach(function(truck){ids.push(truck._id)});
    return ids;
}

 var getNotFreeTrucksIdsJSON = function() {
    var ids = [];
    var todayMidnight = new Date().setHours(0,0,0,0);
    
    Jobs.find({truckId:{$ne:null}, completionTime:null, cancellationTime:null}).forEach(function(job){ids.push(JSON.stringify(job.truckId))});
    Trucks.find({sentToHisBaseOn:{$gte: new Date(todayMidnight)}}).forEach(function(truck){ids.push(JSON.stringify(truck._id))});
    return ids;
}


var deleteMarker = function(id){
    Markers[id].setMap(null);

    // Clear the event listener
    google.maps.event.clearInstanceListeners(Markers[id]);

    // Remove the reference to this marker instance
    delete Markers[id];
}

var addMarker = function(id, map){
    var truck = Trucks.findOne({_id:id});

    //define if the truck is new or not
    var path = getIconPathForTruck(id);

    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(truck.lastLocation.coordinate.lat, truck.lastLocation.coordinate.lng),
        map: map.instance,
        _id: truck._id,
        icon: path
    });

    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function(){marker.setAnimation(null)}, 3000);

    google.maps.event.addListener(marker, 'click', function() {
        showDetails(marker._id);
    });

    google.maps.event.addListener(marker, 'dblclick', function() {
        endDayForTruck(marker._id);
    });

    // Store this marker instance within the Markers object.
    Markers[truck._id] = marker;
}


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
                added: function(truck) {
                    if(getNotFreeTrucksIdsJSON().indexOf(JSON.stringify(truck._id)) == -1 ){
                        addMarker(truck._id, map);
                    }
                },

                changed: function(newTruck, oldTruck) {
                    if(getNotFreeTrucksIdsJSON().indexOf(JSON.stringify(newTruck._id)) == -1 ){
                        Markers[newTruck._id].setPosition({ lat: newTruck.lastLocation.coordinate.lat, lng: newTruck.lastLocation.coordinate.lng });
                    }else{
                        deleteMarker(newTruck._id);
                    }
                },

                removed: function(oldTruck) {
                    deleteMarker(oldTruck._id);
                }
            });
            Jobs.find().observe(
            {
              changed:function(newJob, oldJob){
                  if(JSON.stringify(oldJob.truckId) != JSON.stringify(newJob.truckId))
                  {
                      if(!oldJob.truckId){
                            deleteMarker(newJob.truckId)
                        }else if(!newJob.truckId){
                            addMarker(oldJob.truckId, map);

                        }else{
                            deleteMarker(newJob.truckId);
                            addMarker(oldJob.truckId, map);
                        }
                  }
                  else if(oldJob.cancellationTime != newJob.cancellationTime){
                    if(!oldJob.cancellationTime){
                        addMarker(newJob.truckId, map);
                    }else if(!newJob.cancellationTime){
                        deleteMarker(oldJob.truckId);
                    }
                  }
                  else if(!oldJob.completionTime && newJob.completionTime){
                      addMarker(newJob.truckId, map);

                  }

              }
            })            
        });
    });
    Template.leftPart.helpers({
        trucks: function() {
            var ids = []
            var todayMidnight = new Date().setHours(0,0,0,0);
            Jobs.find({truckId:{$ne:null}, completionTime:null, cancellationTime:null},{truckId:1}).forEach(function(job){ids.push(job.truckId)});
            Trucks.find({sentToHisBaseOn:{$gte: new Date(todayMidnight)}}).forEach(function(truck){ids.push(truck._id)});;

            return Trucks.find({_id:{$nin:ids}});
        }
    });
    Template.jobItem.helpers({
        truck: function() {
            return Trucks.findOne({_id:this.truckId});
        },
        trailer: function() {    
            return Trailers.findOne({_id:this.trailerId});
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
                allocateJob(this._id);
            }
        }
    })
    Template.rightPart.helpers({
        jobs: function() {
            return Session.get("selectedID")?getSortedJobForTruck(Session.get("selectedID")):[];
        }
    });
    Template.selectedTruck.helpers({
        selectedTruck: function() {
            return Trucks.findOne({_id:Session.get("selectedID")});
        },
        driver: function() {
            return Drivers.findOne({_id:Trucks.findOne({_id:Session.get("selectedID")}).driverId});
        },
        trailer: function() {    
            return Trailers.findOne({_id:Trucks.findOne({_id:Session.get("selectedID")}).trailerId});
        }
    });
    Template.truckItem.helpers({
        selected: function() {
            return Session.get("selectedID") && this._id.toJSONValue() == Session.get("selectedID").toJSONValue();
        },
        driver: function() {
            return Drivers.findOne({_id:this.driverId});
        },
        trailer: function() {    
            return Trailers.findOne({_id:this.trailerId});
        }
    });
    Template.truckItem.events({
        "click .truckItem": function() {
            if(arguments[0].altKey){
                endDayForTruck(this._id);
            }else{
                showDetails(this._id);
            }
        },
        "dblclick .truckItem": function() {
        }
    });

    function getSortedJobForTruck(truckId) {
        var truck = Trucks.findOne({_id: truckId})
        var recommendedJobs = Jobs.find({recommendedTruck:truck._id}).fetch();
        var outstandingJobs = Jobs.find({allocationTime:null}).fetch();
        outstandingJobs.forEach(function(job) {
            recommendedJobs.forEach(function(jobR) {
                if (jobR._id.toJSONValue() == job._id.toJSONValue()) {
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

