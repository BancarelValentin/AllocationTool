  {
    driver:{
      id:0,
      adrLevel:0,
      firstName:"John",
      lastName:"Doe",
      baseLocation:{
        type:"quay",//quay || industrial estate || garage
        name:"Dyce",
        coordinate:{lat:57.110340, lng: -2.038301}
      },
      employeeId:0,//unknow
      isAirportTraining:true
    },
    
    job:{
      id:0,
      needAdr:0,
      customerId:0,
      jobInputTime:"",
      jobCompletionTime:"",
      jobType:"ad-hoc",//ad-hoc || inbound || outbound || local
      specificTrailerID:0,//to be defined
      trailerId:0,
      jobReferenceNumber:"JFH30F",
      truckId:0,
      jobAllocationTime:"",
      jobCancellationTime:"",
      jobCollectionTime:"",
      jobInfo:"No extra informations for that job",
      check:true,
      recommendedTruck:0,
      steps:[
        {type:"takeTrailer",
          earliestTime:"",
          latestTime:"",
          actualTime:"",
          trailerId:"0",
          location:{lat:57.147340, lng: -2.089301} 
        },
        {type:"collection",
          earliestTime:"",
          latestTime:"",
          actualTime:"",
          location:{lat:57.147340, lng: -2.089301} 
        },
        {type:"delivery",
          earliestTime:"",
          latestTime:"",
          actualTime:"",
          location:{
            type:"quay",//quay || industrial estate || garage
            name:"Dyce",
            coordinate:{lat:57.110340, lng: -2.038301}
          } 
        }
      ]
    },
    
    truck:{
      id:0,
      name:"Lightning McQueen",
      registration:"",
      driverId:0;
      lastLocation:{
        type:"quay",//quay || industrial estate || garage
        name:"Dyce",
        coordinate:{lat:57.110340, lng: -2.038301}
      },
      trailerId:0
    },
    
    trailer:{
      id:0,
      name:"Lightning McQueen",
      type:"",//
      lastLocation:{
        type:"quay",//quay || industrial estate || garage
        name:"Dyce",
        coordinate:{lat:57.110340, lng: -2.038301}
      },
    },
    
    customer:{
      id:0,
      name:"BP"
    },
  }