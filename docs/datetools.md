<a name="module_DateTools"></a>

## DateTools
Various simplified date-handling utilities to avoid loading MomentJS in browser-facing apps.

<a name="exp_module_DateTools--timeAgo"></a>

### timeAgo([timestamp]) ⇒ <code>string</code> ⏏
Convert a timestamp in "time ago" format. We don't use Moment.JS because it's HUUUUUUGE.

**Kind**: Exported function  

| Param | Type | Description |
| --- | --- | --- |
| [timestamp] | <code>number</code> | The time stamp to convert. Should include milliseconds (e.g. Date.now()). |

