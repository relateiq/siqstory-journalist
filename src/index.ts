///<reference path="../typings/index.d.ts" />
import {SiqStoryTwist} from './types'
import {SiqStoryNode} from './types'
import {SiqStoryNodeId} from './types'
var _flatten = require('lodash/flatten');
var uuid = require('uuid');
module.exports = function(debugMode?: boolean) {

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

        let twist = new SiqStoryTwist('childList', new SiqStoryNode(target));
        twist.addedNodes = addedNodes.map(function(addedNode) {
            let storyNode = makeSiqStoryNode(addedNode);
            if (storyNode.tagName === 'LINK') {
                if (storyNode.attributes['href']) {
                    let path = absolutePath(storyNode.attributes['href']);
                    storyNode.attributes['href'] = path;
                }
            } else if (storyNode.tagName === 'SCRIPT') {
                storyNode.tagName = 'POOP-SCRIPT'; // don't let these execute
            }
            return storyNode;
        });
        return twist;
    }

    function filterAddedNodelist(addedNodeList) {
        return Array.prototype.slice.call(addedNodeList).filter(function(addedNode) {
            return true;
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

    function getHighestParent(elem) {
        let parent = elem.parentNode;
        while (parent) {
            elem = parent;
            parent = elem.parentNode
        }
        return elem;
    }

    function isInDom(elem) {
        return getHighestParent(elem) === document;
    }

    const journalistObserver = new MutationObserver(function(mutations: MutationRecord[]) {
        let twists: SiqStoryTwist[] =
            mutations.reduce(function(accum: SiqStoryTwist[], mutation: MutationRecord) {
                // for whatever reason we can sometimes get mutations for things that are not in the dom
                if (!isInDom(mutation.target)) {
                    return accum;
                }
                switch (mutation.type) {
                    case 'childList':
                        if (mutation.addedNodes.length) {
                            accum = accum.concat(walkAddTree(filterAddedNodelist(mutation.addedNodes), mutation.target));
                        }
                        if (mutation.removedNodes.length) {
                            let twist = new SiqStoryTwist(mutation.type, new SiqStoryNode(mutation.target));
                            twist.removedNodes = Array.prototype.slice.call(mutation.removedNodes).map(makeSiqStoryNode);
                            accum.push(twist);
                        }

                        break;
                    case 'attributes': {
                        let twist = new SiqStoryTwist(mutation.type, new SiqStoryNode(mutation.target));
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

    function makeAndAddResizeTwist() {
        let resizeTwist = new SiqStoryTwist('resize', null);
        resizeTwist.width = window.innerWidth;
        resizeTwist.height = window.innerHeight;
        recordedTwists.push(resizeTwist);
    }

    window.addEventListener('resize', function(e) {
        makeAndAddResizeTwist();
    });
    makeAndAddResizeTwist(); // one to intialize

    let events = ['mousemove', 'mousedown', 'mouseup', 'input'];

    events.forEach(function(eventType) {
        document.addEventListener(eventType, function(e) {
            let targetNode;
            let twist;
            let target = e.target;
            switch (e.type) {
                case 'mouseup':
                case 'mousedown':
                    if (target instanceof Node) {
                        targetNode = new SiqStoryNode(target);
                    }
                case 'mousemove':
                    twist = new SiqStoryTwist('event', targetNode);
                    twist.eventType = e.type;
                    if (e instanceof MouseEvent) {
                        twist.clientX = e.clientX;
                        twist.clientY = e.clientY;
                    }
                    break;
                case 'input':
                    if (target instanceof Node) {
                        targetNode = new SiqStoryNode(target);
                    }
                    twist = new SiqStoryTwist('event', targetNode);
                    twist.eventType = e.type;
                    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                        twist.textValue = target.value;
                    }
                    break;
            }
            recordedTwists.push(twist);
        }, true);
    });

    setInterval(function() {
        // call inside anonymous to allow debuggin overrides
        siqStoryJournalist.sendTwists(recordedTwists);
    }, 5000);

    var siqStoryJournalist = {
        // you can just override this method if you want to log them or something instead
        lastTwistsLength: 0,
        sendTwists: function(twists) {
            if (!twists.length || twists.length === siqStoryJournalist.lastTwistsLength) {
                return;
            }
            siqStoryJournalist.lastTwistsLength = twists.length;
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
    return siqStoryJournalist;
};

