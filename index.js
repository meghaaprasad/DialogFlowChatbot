'use strict';
const functions = require('firebase-functions');
const moment = require('moment');
const {dialogflow, BasicCard, Button, Image, Suggestions,Permission,SimpleResponse, Table} = require('actions-on-google');
const {
  LinkOutSuggestion,
  OpenUrlAction
} = require('actions-on-google'); 
const app = dialogflow();
let locationsList =['Pune', 'Mumbai', 'Chennai', 'Kolkata', 'Patna'];
var validSeats = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','B6','C1','C2','C3','C4','C5','C6'];
var travelClass = ['EC', '1AC', '2AC', '3AC','Change Destination','Start Over'];
var listCars = ['Ford Mondeo','Honda CRV'];

app.intent('Default Welcome Intent', (conv) => {
    console.log('Hi, This the default welcome intent in fulfillment' + JSON.stringify(conv.parameters));    
    conv.ask('Hi I am your travel planner. You can ask me to book your train ticket(s) and car rental.');
    conv.ask(new Suggestions(['Book Train Ticket', 'Car Rent']));
  });

app.intent('get_current_location', (conv) => {
  conv.data.requestedPermission = 'DEVICE_PRECISE_LOCATION';
  conv.ask(new Permission({
    context: 'To locate you',
    permissions: conv.data.requestedPermission,
  }));
});

  app.intent('Default Fallback Intent', (conv) => {
    conv.ask('I do not understand, could you please try again?');
  });

   app.intent("book_train_ticket_get_travelclass", (conv) => {
    console.log('In getting travel class intent');
    const bookingContext = conv.contexts.get('booktrainticket');

    if(bookingContext !== undefined ) {
      console.log('Context bookingContext');
      if(bookingContext.parameters !== undefined) {
        console.log('bookingContext.parameters '+ JSON.stringify(bookingContext.parameters));
      }
      console.log(JSON.stringify(bookingContext));

    }
    const bookingTravelClassContext = conv.contexts.get('book_train_ticket_get_travelclass');
    console.log(JSON.stringify(bookingTravelClassContext));
   if(isEmpty(conv.parameters.travelClass)) {
    conv.ask('Which class do you want to travel?');   
    conv.ask(new Suggestions(travelClass));
   } else if(conv.query === 'Change Destination') {
    conv.followup('book_train_ticket_change_destination');
    } else {
      console.log('travel class selected as '+conv.parameters.travelClass);
      conv.followup('select_seat_confirmation');
    }
});

app.intent('select_seat_confirmation', (conv)=>{
  conv.ask('Do you want to select seats?');
  conv.ask(new Suggestions(['Yes','No']));
});

app.intent('select_seat_confirmation - yes', (conv)=>{
  conv.followup('book_train_ticket_get_seats');
});

app.intent('select_seat_confirmation - no', (conv)=>{
  conv.followup('book_train_ticket_payment_confirmation'); 
})

app.intent('book_train_ticket_change_destination', (conv) => {
  const bookingContext = conv.contexts.get('booktrainticket');
  if(bookingContext !== undefined ) {
  if(isEmpty(conv.parameters.destination)) {
    var destinationList =locationsList.filter(val => val.toLowerCase() !== bookingContext.parameters.origin.toLocaleLowerCase());// [...locationsList];
    conv.ask('What is the destination of train?');
    conv.ask(new Suggestions(destinationList));
  }
  else {
    conv.contexts.set('booktrainticket',5,{
      destination: conv.parameters.destination
    });
    conv.followup('book_train_ticket_change_date');
  }
}
});

app.intent('book_train_ticket_change_date', (conv) => {
  const bookingContext = conv.contexts.get('booktrainticket');
  if(bookingContext !== undefined ) {
    if(isEmpty(conv.parameters.travelDate)) {
      conv.ask('For when do you want to book the train tickets?');
       let today = new Date();
       let threeDaysFromNow = moment(today).add(3, 'days').format('dddd');
       console.log(threeDaysFromNow);
      conv.ask(new Suggestions(['Today', 'Tomorrow', threeDaysFromNow]));
   }
      else if(conv.query.toLocaleLowerCase() === 'tomorrow') {
     conv.add('No trains are available for tomorrow');
     conv.ask(new Suggestions(['Change Date', 'Change Destination', 'Start Over']));
  }
   else {
    conv.contexts.set('booktrainticket',5,{
      travelDate: conv.parameters.travelDate
    });
     console.log(`Your train ticket is booked from ${conv.parameters.origin} to ${conv.parameters.destination} on ${conv.parameters.travelDate}`);
     conv.followup('book_train_get_travelclass');     
   }
}
});

app.intent('travel_planner_end', (conv) => {
  conv.close(`Have a great journey!! \uD83D\uDE03`);
});

app.intent("book_train_ticket_get_seats", (conv) => {
  console.log('In getting seats intent');
  const bookingContext = conv.contexts.get('booktrainticket');
  if(bookingContext !== undefined ) {
    console.log('Context bookingContext');
    if(bookingContext.parameters !== undefined) {
      console.log('bookingContext.parameters '+ JSON.stringify(bookingContext.parameters));
    }
    console.log(JSON.stringify(bookingContext));

  }

  const bookingTravelClassContext = conv.contexts.get('book_train_ticket_get_travelclass');
  console.log(JSON.stringify(bookingTravelClassContext));
  console
  if(isEmpty(conv.parameters.travelSeat) || 
      (!isEmpty(conv.parameters.travelSeat) && 
        validSeats.findIndex(seat => seat === conv.parameters.travelSeat) === -1)) {
    conv.add(`Awesome, please select your seat/s for train from ${bookingContext.parameters.origin} to ${bookingContext.parameters.destination} for ${bookingTravelClassContext.parameters.travelClass}\n`);   
    conv.add(new Table({
      dividers: true,
      rows: [
            ['A', '1', '2', '3','4','5','6'],
            ['B', '1', '2', '3','4','5','6'], 
            ['C', '1', '2', '3','4','5','6']
    ],
    columns: [],
    }));
 } else {
   console.log('Moving to payment confirmation for travel seat '+ conv.parameters.travelSeat);
   conv.followup('book_train_ticket_payment_confirmation');  
 }
});


app.intent("book_train_ticket_payment_confirmation", (conv) => {
  conv.ask(`Please complete payment by clicking here`);
  conv.ask(new BasicCard({text: `Please complete payment by clicking <a href='https://assistant.google.com/' target="_blank">here</a>:`}));
  conv.ask(new LinkOutSuggestion({
    name: 'Payment Link',
    url: new OpenUrlAction({url : 'https://assistant.google.com/'}).url,

  }));
  conv.ask(new Suggestions(['Payment Completed'])); 
});

app.intent("book_train_ticket_payment_completed", (conv) => {
    var bookingId = createUUID();
    conv.add(`Thank you for your payment!!\n Your tickets have been booked and your booking id is ${bookingId}\n Do you want to rent a car also?`);    
    conv.ask(new Suggestions(['Yes','No']));
});
app.intent("book_train_ticket_payment_completed - no", (conv) => {  
    console.log('this is selected No for renting a car. Finishing booking');
    conv.followup('travel_planner_end');
});

app.intent("book_train_ticket_payment_completed - yes", (conv) => {

    console.log('this is selected Yes for renting a car. Moving to rent a car');
    const existingContext =conv.contexts.get('booktrainticket');
    conv.contexts.set('booktrainticket',5,{
      bookingtime : new Date(),
      destination: existingContext.parameters.destination
    });
    conv.followup('rent_a_car');
  
});

app.intent('rent_a_car', (conv) => {
  const existingBookingContext =conv.contexts.get('booktrainticket');
  if(existingBookingContext !== undefined && existingBookingContext.parameters.bookingtime !== undefined
    && compareDatesWithin20Seconds(existingBookingContext.parameters.bookingtime, new Date())) {
    console.log(existingBookingContext.parameters);
      conv.ask(`Do you want to rent a car at ${existingBookingContext.parameters.destination} \n`);
      conv.ask(new Suggestions(['Yes','No'])); 
    }
});

app.intent('rent_a_car - no', (conv) => {
  console.log('No I dont want to book car at provided destination');
  conv.followup('rent_a_car_no_followup');
});

app.intent('rent_a_car - yes',(conv) => {
  console.log('Yes I do want to book car at provided destination');
  const existingBookingContext =conv.contexts.get('booktrainticket');
  if(existingBookingContext !== undefined){
  conv.contexts.set('rentcarfollowup',5,{
    destination:existingBookingContext.parameters.destination,
    bookingDate: existingBookingContext.parameters.travelDate
  });

  conv.followup('rent_a_car_select_car');
}
});


app.intent('rent_a_car_no_followup', (conv) => {
  console.log('In rent car destination ');
  if(isEmpty(conv.parameters.destination)) {
    console.log('for destination provided '+ conv.parameters.destination);
      conv.ask('Please provide location for your car rental \n');
      conv.ask(new Suggestions(locationsList));
  }
  else {
    conv.contexts.set('rentcarfollowup',5,{
      destination:conv.parameters.destination
    });
    conv.followup('rent_a_car_no_followup_dateselect');
  }
});

app.intent('rent_a_car_no_followup_dateselect', (conv) => {
  if(isEmpty(conv.parameters.rentalDate)) {
      conv.ask('For when do you want to rent car \n');
      conv.ask(new Suggestions(['Today','Tomorrow']));
  }
  else {
    console.log('Date provided for travel '+ conv.parameters.rentalDate);
    conv.contexts.set('rentcarfollowup', 5, {
      bookingDate:conv.parameters.rentalDate
    });
    conv.followup('rent_a_car_select_car');
  }
});

app.intent('rent_a_car_select_car', (conv) => {
  console.log('in select car intent');
  const car = conv.parameters.carName;
  if(isEmpty(car) || car === undefined) {
    conv.ask('Please select from below available cars \n');
    conv.ask(new Suggestions(listCars));
  } else if ( !isEmpty(car) && car !== undefined
  && !listCars.includes(car)) {
    conv.followup('rent_a_car_select_carfallback');
  }
  else {
    console.log(' value accepted for car '+conv.parameters.carName);
    conv.contexts.set('rentcarfollowup',5,{
      carName:conv.parameters.carName
    });
    conv.followup('rent_a_car_completed');
  }
});

app.intent('rent_a_car_select_car - fallback', (conv) => {
  console.log('in fallback '+JSON.stringify(conv.parameters));
    conv.ask('Please select from below available cars \n');
    conv.ask(new Suggestions(listCars));
});

app.intent('rent_a_car_completed', (conv)=>{
  var carSelectedContext = conv.contexts.get('rentcarfollowup');
  if(carSelectedContext!==undefined && carSelectedContext.parameters !== undefined) {
    conv.close(`${carSelectedContext.parameters.carName} booked for ${carSelectedContext.parameters.destination} for
    ${getFormattedDate(carSelectedContext.parameters.bookingDate)} `);
  }  
});

app.intent('book_train_ticket', (conv,permissionGranted) => {
  console.log('Hi, This the default welcome intent in fulfillment' + JSON.stringify(conv.parameters)); 
  let currentLocation;
  if (permissionGranted) {
    const { requestedPermission } = conv.data;    
    if (requestedPermission === "DEVICE_PRECISE_LOCATION") {
      const { location } = conv.device;
      if(location !== undefined) {
        currentLocation = location.city;
      }
    }
  }
    if(isEmpty(conv.parameters.origin)) {
       let locationsListWithOrigin = [...locationsList];
      if(!isEmpty(currentLocation) && currentLocation !== undefined) {
       console.log('Hi, current location when adding to list '+ currentLocation);      
       locationsListWithOrigin.splice(0, 0, currentLocation);            
      }
       conv.ask('What is the origin of train?');
       conv.ask(new Suggestions(locationsListWithOrigin));
    }
      else if(isEmpty(conv.parameters.destination)) {
       var destinationList = locationsList.filter(val => val.toLowerCase() !== conv.parameters.origin.toLocaleLowerCase());
       conv.ask('What is the destination of train?');
       conv.ask(new Suggestions(destinationList));
    }
      else if(isEmpty(conv.parameters.travelDate)) {
       conv.ask('For when do you want to book the train tickets?');
        let today = new Date();
        let threeDaysFromNow = moment(today).add(3, 'days').format('dddd');
        console.log(threeDaysFromNow);
       conv.ask(new Suggestions(['Today', 'Tomorrow', threeDaysFromNow]));
    }
      else if(conv.query.toLocaleLowerCase() === 'tomorrow') {
      conv.add('No trains are available for tomorrow');
      conv.ask(new Suggestions(['Change Date', 'Change Destination', 'Start Over']));
   }
    else {
      console.log(`Your train ticket is booked from ${conv.parameters.origin} to ${conv.parameters.destination} on ${conv.parameters.travelDate}`);      
      conv.followup('book_train_get_travelclass');
      
    }
  });

  app.intent('Default Fallback Intent', (conv) => {
    conv.ask('I do not understand, could you please try again?');
  });


function isEmpty(val) {
  return (val === undefined || val == null || val.length <= 0) ? true:false;
}

function isTravelDateSelectedTomorrow(val) {
  var valueToCheck = moment(val).format('DD MMM YYYY').toString();
  var tomorrow = moment().add(1, 'days').format('DD MMM YYYY').toString();
  console.log(`checking value ${valueToCheck} with ${tomorrow}`);
  return (valueToCheck === tomorrow) ? true:false;
}
function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function compareDatesWithin20Seconds (date1, date2) {
  date2 = moment(date2);
  date1 = moment(date1);
  var timeDifference = date2.diff(date1, 'seconds');
  console.log(`Difference between dates ${date2} and ${date1 }  in seconds is : ${timeDifference}`);
  return timeDifference <= 20 ? true:false;
}

function getFormattedDate(date) {
  return moment(date).format('DD MMM YYYY');
}

function validateString(str) {
  const regex = /^[a-z1-6]$/;
  return regex.test(str.toLocaleLowerCase());
}

  exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
