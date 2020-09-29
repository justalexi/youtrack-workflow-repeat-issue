var entities = require('@jetbrains/youtrack-scripting-api/entities');
var hasValidNonemptyRepeatField = require('./has-valid-nonempty-repeat-field');

exports.rule = entities.Issue.onSchedule({
  title: 'Clone this issue to the next Repeat Date and change its State to Obsolete',
  // TODO: maybe add 'StartDateAndTime' to search
  search: '#Unresolved has: {Repeat}',
  // For format details refer to http://www.quartz-scheduler.org/documentation/quartz-2.3.0/tutorials/crontrigger.html
  // Fire at 1 minute past midnight
  cron: '0 1 0 * * ?',
  // TODO: to mute notifications for changes that are applied by this rule, set to true
  muteUpdateNotifications: false,
  guard: function(ctx) {
    if (!ctx.issue.fields.Repeat) {
      return false;
    }
    
    // This check allows skipping automatic obsoleteness for issues with invalid 'Repeat' (like '+', 'manualrepeat', 'on', etc.)
    if (!hasValidNonemptyRepeatField(ctx.issue.fields.Repeat)) {
      return false;
    }
    
    // 'FinishDateAndTime' determines whether the issue is obsolete
    // TODO: test taking into account FinishDateAndTime
    if (ctx.issue.fields.FinishDateAndTime) {
      return ctx.issue.fields.FinishDateAndTime < Date.now();
    }
    
    // If 'FinishDateAndTime' is undefined, then 'StartDateAndTime' determines obsoleteness
    return ctx.issue.fields.StartDateAndTime && ctx.issue.fields.StartDateAndTime < Date.now();
  },
  action: function(ctx) {
    var issue = ctx.issue;
    issue.fields.State = ctx.State.Obsolete;
  },
  requirements: {
    State: {
      type: entities.State.fieldType,
      Obsolete: {}
    },
    Repeat: {
      type: entities.Field.stringType
    },
    StartDateAndTime: {
      type: entities.Field.dateTimeType,
      name: 'Start date and time'
    },
    FinishDateAndTime: {
      type: entities.Field.dateTimeType,
      name: 'Finish date and time'
    }
  }
});