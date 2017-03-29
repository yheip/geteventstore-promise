require('./_globalHooks');

const tcpConfig = require('./support/tcpConfig');
const eventstore = require('../index.js');
const Promise = require('bluebird');
const assert = require('assert');
const uuid = require('uuid');
const _ = require('lodash');

describe('TCP Client - Stress Tests', () => {
    it('Should handle parallel writes', function() {
        this.timeout(20000);
        const client = eventstore.tcp(tcpConfig);

        const testStream = `TestStream-${uuid.v4()}`;
        const numberOfEvents = 5000;
        const events = [];

        for (let i = 1; i <= numberOfEvents; i++) {
            events.push(eventstore.eventFactory.NewEvent('TestEventType', {
                something: i
            }));
        }

        return Promise.map(events, ev => client.writeEvent(testStream, ev.eventType, ev.data)).then(() => client.getEvents(testStream, undefined, 5000).then(events => {
            assert.equal(events.length, 4096);
        }));
    });

    it('Should handle parallel reads and writes', function(callback) {
        this.timeout(60000);
        const client = eventstore.tcp(tcpConfig);

        const testStream = `TestStream-${uuid.v4()}`;
        const numberOfEvents = 5000;
        const events = [];
        let writeCount = 0;
        let readCount = 0;

        for (let i = 1; i <= numberOfEvents; i++) {
            events.push(eventstore.eventFactory.NewEvent('TestEventType', {
                something: i
            }));
        }

        const checkCounts = () => {
            if (readCount === numberOfEvents && writeCount === numberOfEvents && writeCount === readCount) callback();
        };

        _.each(events, ev => {
            client.writeEvent(testStream, ev.eventType, ev.data).then(() => {
                writeCount++;
                checkCounts();
            });
        });
        _.each(events, () => {
            client.getEvents(testStream, undefined, 10).then(() => {
                readCount++;
                checkCounts();
            });
        });
    });
});