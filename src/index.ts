///<reference path="../typings/index.d.ts" />
import {SiqStoryTwist} from './types'
import {SiqStoryNode} from './types'
import {SiqStoryNodeId} from './types'
var _flatten = require('lodash/flatten');
var uuid = require('uuid');

let recordedTwists: SiqStoryTwist[];
let story = {
    id: uuid.v1(),
    timestamp: Date.now(),
    twists: null
}

// get initial dom state
recordedTwists = walkAddTree(document.childNodes, document);

function makeSiqStoryNode(node: Node) {
    return new SiqStoryNode(node);
}

function absolutePath(href) {
    var link = document.createElement("a");
    link.href = href;
    return (link.protocol + "//" + link.host + link.pathname + link.search + link.hash);
}

function makeAddTwist(addedNodes, target) {

    let twist = new SiqStoryTwist('childList', SiqStoryNodeId.getStoryNodeId(target));
    twist.addedNodes = addedNodes.map(function(addedNode) {
        let storyNode = makeSiqStoryNode(addedNode);
        if (storyNode.tagName === 'LINK') {
            if (storyNode.attributes['href']) {
                let path = absolutePath(storyNode.attributes['href']);
                storyNode.attributes['href'] = path;
            }
        }
        return storyNode;
    });
    return twist;
}

function filterAddedNodelist(addedNodeList) {
    return Array.prototype.slice.call(addedNodeList).filter(function(addedNode) {
        return addedNode.tagName !== 'SCRIPT';
    });
}

function walkAddTree(addedNodeList: NodeList, target: Node): SiqStoryTwist[] {
    let addedNodes = filterAddedNodelist(addedNodeList);
    let twist = makeAddTwist(addedNodes, target);
    var results = _flatten(addedNodes.map(function(addedNode) {
        if (addedNode.childNodes.length) {
            return walkAddTree(addedNode.childNodes, addedNode);
        }
        return [];
    }));
    results.unshift(twist);
    return results;
}

const journalistObserver = new MutationObserver(function(mutations: MutationRecord[]) {
    let twists: SiqStoryTwist[] =
        mutations.reduce(function(accum: SiqStoryTwist[], mutation: MutationRecord) {
            switch (mutation.type) {
                case 'childList':
                    if (mutation.addedNodes.length) {
                        accum = accum.concat(walkAddTree(filterAddedNodelist(mutation.addedNodes), mutation.target));
                    }
                    if (mutation.removedNodes.length) {
                        let twist = new SiqStoryTwist(mutation.type, SiqStoryNodeId.getStoryNodeId(mutation.target));
                        twist.removedNodes = Array.prototype.slice.call(mutation.removedNodes).map(makeSiqStoryNode);
                        accum.push(twist);
                    }

                    break;
                case 'attributes': {
                    let twist = new SiqStoryTwist(mutation.type, SiqStoryNodeId.getStoryNodeId(mutation.target));
                    twist.attributeName = mutation.attributeName;
                    twist.attributeValue = (<Element>mutation.target).getAttribute(mutation.attributeName);
                    accum.push(twist);
                    break;
                }
            }

            return accum;
        }, []);
    recordedTwists = recordedTwists.concat(twists);
});

journalistObserver.observe(document,
    { childList: true, subtree: true, attributes: true }
);

setInterval(function() {
    // call inside anonymous to allow debuggin overrides
    siqStoryJournalist.sendTwists(recordedTwists);
}, 5000);

var siqStoryJournalist = {
    // you can just override this method if you want to log them or something instead
    sendTwists: function(twists) {
        if (!twists.length) {
            return;
        }
        // TODO: network call
        story.twists = twists;
        var oReq = new XMLHttpRequest();
        oReq.onreadystatechange = function() {
            var status;
            var data;
            // https://xhr.spec.whatwg.org/#dom-xmlhttprequest-readystate
            if (oReq.readyState == 4) { // `DONE`
                status = oReq.status;
                if (status == 200) {
                    console.log(oReq.response);
                } else {
                    console.log('error')
                }
            }
        }; oReq.open("POST", 'https://4kz2iij01i.execute-api.us-east-1.amazonaws.com/production/story');
        oReq.setRequestHeader('Accept', 'application/json');
        oReq.send(JSON.stringify(story));
    },
    popRecordedTwists: function() {
        let twists = recordedTwists;
        recordedTwists = [];
        return twists;
    }
};
module.exports = siqStoryJournalist;
