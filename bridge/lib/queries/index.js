const r = require('rethinkdb');

const standardQuery = { includeInitial: true, includeStates: true, includeOffsets: true, includeTypes: true };
const noRangeQuery = { includeInitial: true, includeTypes: true };

const queries = {};

// Simple listing of entries from a specified table, sorted by a field name. Note that nearly all collection queries
// will require a limit or RethinkDB will throw an error about an "eager" query.
queries.trendingProducts = db =>
    r.table('trending')
        .orderBy({ index: r.asc('id') })
        .limit(20)
        .changes(standardQuery);

// Interest Feed
// TODO: Verify the user owns the Interest!
queries.interestFeed = (db, socket, params) =>
    r.table('feeds')
        .between(
            [params.interestId, false, false, r.minval],
            [params.interestId, false, false, r.maxval],
            { index: 'activeFeed' }
        )
        .orderBy({ index: r.desc('activeFeed') })
        .limit(40)
        .changes(standardQuery);

// My Interests
queries.myInterests = (db, socket) =>
    r.table('privateinterests')
        .between(
            [socket.session.userId, r.minval],
            [socket.session.userId, r.maxval],
            { index: 'myInterests' }
        )
        .orderBy({ index: r.asc('myInterests') })
        .limit(100)
        .changes(standardQuery);

// My Activities
queries.myActivities = (db, socket) =>
    r.table('activities')
        .between(
            [socket.session.userId, r.minval],
            [socket.session.userId, r.maxval],
            { index: 'myActivities' }
        )
        .orderBy({ index: r.desc('myActivities') })
        .limit(100)
        .changes(standardQuery);

// All My Read Articles
queries.allRead = (db, socket) =>
    r.table('read')
        .between(
            [socket.session.userId, r.minval],
            [socket.session.userId, r.maxval],
            { index: 'allRead' }
        )
        .orderBy({ index: r.desc('allRead') })
        .limit(100)
        .changes(standardQuery);

// Read Articles for one Interest
queries.interestRead = (db, socket, params) =>
    r.table('read')
        .between(
            [params.interestId, r.minval],
            [params.interestId, r.maxval],
            { index: 'interestRead' }
        )
        .orderBy({ index: r.desc('interestRead') })
        .limit(100)
        .changes(standardQuery);

// My Rushes
queries.myRushes = (db, socket) =>
    r.table('rushes')
        .between(
            [socket.session.userId, r.minval],
            [socket.session.userId, r.maxval],
            { index: 'myRushes' }
        )
        .orderBy({ index: r.desc('myRushes') })
        .limit(50)
        .changes(standardQuery);

// My Inbox: Unread
queries.myInboxUnread = (db, socket) =>
    r.table('inboxes')
        .between(
            [socket.session.userId, false, false, r.minval],
            [socket.session.userId, false, false, r.maxval],
            { index: 'myInbox' }
        )
        .orderBy({ index: r.desc('myInbox') })
        .limit(50)
        .changes(standardQuery);

// My Inbox: Read
queries.myInboxRead = (db, socket) =>
    r.table('inboxes')
        .between(
            [socket.session.userId, false, true, r.minval],
            [socket.session.userId, false, true, r.maxval],
            { index: 'myInbox' }
        )
        .orderBy({ index: r.desc('myInbox') })
        .limit(50)
        .changes(standardQuery);

queries.interestInboxUnread = (db, socket, params) =>
    r.table('inboxes')
        .between(
            [params.interestId, false, false, (new Date(Date.now() - (2 * 86400000)))],
            [params.interestId, false, false, r.maxval],
            { index: 'interestInbox' }
        )
        .orderBy({ index: r.desc('interestInbox') })
        .limit(50)
        .changes(standardQuery);

// My Inbox: By Interest
queries.interestInboxRead = (db, socket, params) =>
    r.table('inboxes')
        .between(
            [params.interestId, false, true, r.minval],
            [params.interestId, false, true, r.maxval],
            { index: 'interestInbox' }
        )
        .orderBy({ index: r.desc('interestInbox') })
        .limit(50)
        .changes(standardQuery);

// Rush Activity
queries.rushActivity = (db, socket, params) =>
    r.table('inboxes')
        .between(
            [params.rushId, r.minval, r.minval],
            [params.rushId, r.maxval, r.maxval],
            { index: 'rushActivity', rightBound: 'closed' }
        )
        .orderBy({ index: r.desc('rushActivity') })
        .limit(100)
        .changes(standardQuery);

// Rush Replies
queries.rushReplies = (db, socket, params) =>
    r.table('comments')
        .between(
            [params.rushId, r.minval],
            [params.rushId, r.maxval],
            { index: 'rushReplies' }
        )
        .orderBy({ index: 'rushReplies' })
        .limit(100)
        .changes(standardQuery)
        .merge(reply => ({
            new_val: {
                user: r.db('newsrush').table('users').get(reply('new_val')('userId')).default({}),
            }
        }));

// My Chats
queries.myChats = (db, socket) =>
    r.table('chats')
        .between(
            [socket.session.userId, r.minval, r.minval],
            [socket.session.userId, r.maxval, r.maxval],
            { index: 'myChats' }
        )
        .orderBy({ index: r.desc('myChats') })
        .limit(50)
        .changes(standardQuery)
        .merge(follow => ({
            new_val: {
                lastComment: r.db('newsrush').table('comments').get(follow('new_val')('lastCommentId')).default({}),
                rush: {
                    user: r.db('newsrush').table('users').get(follow('new_val')('rushUserId')).default({}),
                    interest: r.db('newsrush').table('interests').get(follow('new_val')('rushInterestId')).default({}),
                    article: r.db('newsrush').table('articles').get(follow('new_val')('articleId')).default({}),
                },
            }
        }));

// Discussions I can see
queries.visibleDiscussions = (db, socket, params) =>
    r.table('rushes')
        .between([params.articleId], [+params.articleId + 1], { index: 'articleId' })
        .orderBy({ index: 'articleId' })
        .limit(50)
        .filter(row => r.or(row('direct').eq(false), row('recipientUserIds').contains(socket.session.userId)))
        .changes(standardQuery);

// Public Interests for a User
queries.userInterests = (db, socket, params) =>
    r.table('interests')
        .between(
            [params.userId, r.minval],
            [params.userId, r.maxval],
            { index: 'userInterests' }
        )
        .orderBy({ index: 'userInterests' })
        .limit(50)
        .changes(standardQuery);

// Public Rushes in an Interest
queries.publicRushes = (db, socket, params) =>
    r.table('rushes')
        .between(
            [params.interestId, false, r.minval],
            [params.interestId, false, r.maxval],
            { index: 'publicRushes' }
        )
        .orderBy({ index: r.desc('publicRushes') })
        .limit(50)
        .changes(standardQuery);

// Default Interests
queries.defaultInterests = db =>
    r.table('defaultinterests')
        .between(
            [r.minval],
            [r.maxval],
            { index: 'defaults' }
        )
        .orderBy({ index: 'defaults' })
        .limit(100)
        .changes(standardQuery);

// Public Followers of an Interest
// TODO: We can clean up a lot of client-side logic when https://github.com/rethinkdb/rethinkdb/issues/3997 is done.
queries.interestFollowers = (db, socket, params) =>
    r.db('newsrush').table('follows')
        .between(
            [params.interestId, r.minval],
            [params.interestId, r.maxval],
            { index: 'followsMe' }
        )
        .orderBy({ index: 'followsMe' })
        .filter({ public: true })
        .changes(noRangeQuery)
        .merge(follow => ({
            new_val: {
                interest: r.db('newsrush').table('interests')
                    .get(follow('new_val')('followedByInterestId'))
                    .default({})
                    .merge(() => ({
                        user: r.db('newsrush').table('users')
                            .get(follow('new_val')('followedByUserId'))
                            .default({})
                    })),
            }
        }));

// Interests that I follow
queries.interestFollows = (db, socket, params) =>
    r.db('newsrush').table('follows')
        .between(
            [params.interestId, r.minval],
            [params.interestId, r.maxval],
            { index: 'followedByMe' }
        )
        .orderBy({ index: 'followedByMe' })
        .changes(noRangeQuery)
        .merge(follow => ({
            new_val: {
                interest: r.db('newsrush').table('interests')
                    .get(follow('new_val')('interestId'))
                    .default({})
                    .merge(interest => ({
                        user: r.db('newsrush').table('users')
                            .get(interest('userId').default(0))
                            .default({})
                    })),
            }
        }));

// Interest Sources (for Settings)
queries.interestSources = (db, socket, params) =>
    r.table('sources')
        .between(
            [params.interestId, r.minval],
            [params.interestId, r.maxval],
            { index: 'interestSources' }
        )
        .orderBy({ index: r.desc('interestSources') })
        .limit(100)
        .changes(standardQuery)
        .merge(follow => ({
            new_val: {
                // TODO: I suppose we could r.or() these so we don't try to include a bogus feed entry if the source
                // is a topic, and vice versa... Right now it's up to the client to ignore that.
                topic: r.db('newsrush').table('topics').get(follow('new_val')('sourceId')).default({}),
                feed: r.db('newsrush').table('feeds').get(follow('new_val')('sourceId')).default({}),
            }
        }));

module.exports = queries;
