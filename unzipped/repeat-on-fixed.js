var entities = require('@jetbrains/youtrack-scripting-api/entities');
var workflow = require('@jetbrains/youtrack-scripting-api/workflow');
var dateTime = require('@jetbrains/youtrack-scripting-api/date-time');

var DAY_IN_MS = 24 * 60 * 60 * 1000;

exports.rule = entities.Issue.onChange({
  title: workflow.i18n('Clone this issue to the next Repeat Date when its State changed to Fixed or Obsolete'),
  guard: function(ctx) {
    var issue = ctx.issue;
    return issue.fields.Repeat && (issue.fields.becomes(ctx.State, ctx.State.Fixed) || issue.fields.becomes(ctx.State, ctx.State.Obsolete));
  },
  action: function(ctx) {
    var issue = ctx.issue;

    // Copy issue
    var newIssue = issue.copy(issue.project);
    newIssue.fields.State = ctx.State.Open;

    // Link issues together
    newIssue.addComment(workflow.i18n('Copied from {0}', issue.id));
    issue.addComment(workflow.i18n('Copied to {0}', newIssue.id));

    if (!issue.fields.StartDateAndTime) {
      // Just clone the issue without setting date for it
      workflow.message(workflow.i18n('StartDateAndTime is empty. Just clone.'));
      return;
    }


    // Rules for 'Repeat' field: 
    // 1. Weekly: MO, TU, WE, TH, FR, SA, SU - find next day of week from current date
    // 2. Monthly: 1, 2, ..., 31 - find next day of month
    // 3. Optionally elements can have '/N' suffix, where N is integer. SA/4 means that the issue will be repeated every fourth saturday (ex. Petshop delivery)
    var issueDateTime = issue.fields.StartDateAndTime;

    var repeatRaw = issue.fields.Repeat;
    var repeatWithoutSpaces = repeatRaw.replace(/\s+/g, '');
    var repeatArr = repeatWithoutSpaces.split(',');

    // Remove invalid values
    var filteredRepeatArr = repeatArr.filter(function(element) {
      var el = element.split('/', 2)[0]; // elementWithoutOptionalSkipSuffix
      var isValidDayOfMonth = (!isNaN(el) && el >= 1 && el <= 31);
      var isValidDayOfWeek = (el === 'MO' || el === 'TU' || el === 'WE' || el === 'TH' || el === 'FR' || el === 'SA' || el === 'SU');
      if (!isValidDayOfMonth && !isValidDayOfWeek) {
        workflow.message(workflow.i18n('Invalid element in Repeat field: ' + el));
      }
      return isValidDayOfMonth || isValidDayOfWeek;
    });

    if (filteredRepeatArr.length === 0) {
      workflow.message(workflow.i18n('Repeat field does not have valid elements: ' + repeatRaw));
      return;
    }

    var skipIncrements = new Array(filteredRepeatArr.length).fill(0);

    // Moved out of for-loop for optimisation
    var nextDate = new Date();

    // ATTENTION! Week starts from Sunday
    var weekDays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    // Check next 366 days (because repeated tasks should trigger at least once a year)
    for (var i = 1; i < 366; i++) {
      // Try next date
      var nextDateMS = issueDateTime + i * DAY_IN_MS;
      nextDate.setTime(nextDateMS);

      // Try every element of 'Repeat' field
      for (var j = 0; j < filteredRepeatArr.length; j++) {
        var repeatElement = filteredRepeatArr[j];
        var repeatElementSplitted = repeatElement.split('/', 2);
        var repeatDateOrDay = repeatElementSplitted[0];
        var skipSuffix = repeatElementSplitted[1];

        if (nextDate.getDate() == repeatDateOrDay || nextDate.getDay() == weekDays.indexOf(repeatDateOrDay)) {
          skipIncrements[j] += 1;
          // Take into account optional skip suffix '/N'
          if (typeof skipSuffix === 'undefined' || skipSuffix == skipIncrements[j]) {
            workflow.message(workflow.i18n('Issue recreated: <a href="{0}">{1}</a>\nat {2}', newIssue.url, newIssue.id, dateTime.format(nextDate)));
            newIssue.fields['Start date and time'] = nextDateMS;
            return;
          }
        }
      }
    }
  },
  requirements: {
    StartDateAndTime: {
      type: entities.Field.dateTimeType,
      name: 'Start date and time'
    },
    Repeat: {
      type: entities.Field.stringType
    },
    State: {
      type: entities.State.fieldType,
      Open: {},
      Fixed: {},
      Obsolete: {}
    }
  }
});