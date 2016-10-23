export class SiqStoryNodeId extends String {
    private static highestNodeId: number = 0;


    public static getStoryNodeId(node: Node, debug?: boolean): string {
        if (node === document) {
            return 'document';
        }
        if (!node['__siqStoryNodeId']) {
            node['__siqStoryNodeId'] = ++SiqStoryNodeId.highestNodeId + '';
        }
        return node['__siqStoryNodeId'];
    }
};

export class SiqStoryNode {

    nodeId: string;
    nodeType: number;
    tagName: string;
    attributes: { [key: string]: string }; // only really for elements
    nodeValue: string; // only really for text nodes
    constructor(node: Node) {
        this.nodeType = node.nodeType;
        this.nodeId = SiqStoryNodeId.getStoryNodeId(node);
        if (node.nodeType === 3 || node.nodeType === 8) {
            this.nodeValue = node.nodeValue;
        }
        if (node.nodeType === 1) {
            this.tagName = (<Element>node).tagName;
        }
        if (node.attributes && node.attributes.length) {
            this.attributes = {};
            //  it looks and acts like an array but is really a NamedNodeMap
            for (let n = 0; n < node.attributes.length; n++) {
                let attr = node.attributes[n];
                this.attributes[attr.name] = attr.value;
            }
        }
    }


}

export class SiqStoryTwist {
    timeSincePageLoad: number;
    type: string; // childList, attributes, event, resize
    addedNodes: SiqStoryNode[];
    removedNodes: SiqStoryNode[];
    targetNode: SiqStoryNode;
    attributeName: string;
    attributeValue: string;
    width: number;
    height: number;
    eventType: string;
    clientX: number;
    clientY: number;
    textValue: string; // for input events

    constructor(type, targetNode) {
        this.type = type;
        this.targetNode = targetNode;
        // TODO: polyfill
        this.timeSincePageLoad = performance.now();
    }
}
