exports.hasValidNonemptyRepeatField = function(repeat) {

  var repeatWithoutSpaces = repeat.replace(/\s+/g, '');
  var repeatArr = repeatWithoutSpaces.split(',');

  // Remove invalid values
  var filteredRepeatArr = repeatArr.filter(function(element) {
    var el = element.split('/', 2)[0]; // elementWithoutOptionalSkipSuffix
    var isValidDayOfMonth = (!isNaN(el) && el >= 1 && el <= 31);
    var isValidDayOfWeek = (el === 'MO' || el === 'TU' || el === 'WE' || el === 'TH' || el === 'FR' || el === 'SA' || el === 'SU');

    return isValidDayOfMonth || isValidDayOfWeek;
  });

  return filteredRepeatArr.length > 0;
};