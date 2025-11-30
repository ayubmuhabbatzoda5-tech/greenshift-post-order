/**
 * Greenshift Post Order - Drag & Drop Handler
 * Adds drag-and-drop functionality to Greenshift Query Loop Builder "Post Names" list
 */

(function() {
    'use strict';

    let draggedElement = null;
    let draggedIndex = null;

    /**
     * Initialize drag-and-drop when Greenshift elements are detected
     */
    function initDragDrop() {
        // Use MutationObserver to detect when Greenshift adds post items
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    attachDragHandlers();
                }
            });
        });

        // Start observing the editor
        const editorContainer = document.querySelector('.edit-post-visual-editor');
        if (editorContainer) {
            observer.observe(editorContainer, {
                childList: true,
                subtree: true
            });
        }

        // Initial attachment
        attachDragHandlers();
    }

    /**
     * Attach drag handlers to all post items
     */
    function attachDragHandlers() {
        // Find all Greenshift manual post item containers
        const postItems = document.querySelectorAll('.gspb-manual-post-item, [class*="manual-post"], [class*="ManualPost"]');
        
        postItems.forEach(function(item, index) {
            // Skip if already has drag handler
            if (item.getAttribute('data-drag-enabled')) {
                return;
            }

            // Mark as drag-enabled
            item.setAttribute('data-drag-enabled', 'true');
            item.setAttribute('draggable', 'true');
            item.style.cursor = 'move';

            // Add drag event listeners
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
            item.addEventListener('dragenter', handleDragEnter);
            item.addEventListener('dragleave', handleDragLeave);
        });
    }

    /**
     * Handle drag start
     */
    function handleDragStart(e) {
        draggedElement = this;
        draggedIndex = getElementIndex(this);
        
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    /**
     * Handle drag over
     */
    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    /**
     * Handle drag enter
     */
    function handleDragEnter(e) {
        if (this !== draggedElement) {
            this.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave
     */
    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    /**
     * Handle drop
     */
    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (draggedElement !== this) {
            // Get the parent container
            const container = this.parentNode;
            const targetIndex = getElementIndex(this);

            // Reorder DOM elements
            if (draggedIndex < targetIndex) {
                container.insertBefore(draggedElement, this.nextSibling);
            } else {
                container.insertBefore(draggedElement, this);
            }

            // Update Greenshift's internal state
            updateGreenshiftOrder(container);
        }

        return false;
    }

    /**
     * Handle drag end
     */
    function handleDragEnd(e) {
        // Remove all drag-related classes
        const items = document.querySelectorAll('.gspb-manual-post-item, [class*="manual-post"], [class*="ManualPost"]');
        items.forEach(function(item) {
            item.classList.remove('dragging', 'drag-over');
        });

        draggedElement = null;
        draggedIndex = null;
    }

    /**
     * Get element index within parent
     */
    function getElementIndex(element) {
        return Array.from(element.parentNode.children).indexOf(element);
    }

    /**
     * Update Greenshift's internal order state
     * This is the critical function that ensures frontend order matches drag-drop order
     */
    function updateGreenshiftOrder(container) {
        // Get all post items in their new order
        const items = container.querySelectorAll('[data-drag-enabled]');
        const newOrder = [];

        items.forEach(function(item) {
            // Extract post ID from the item
            // Greenshift typically stores post IDs in data attributes or within the element
            const postId = extractPostId(item);
            if (postId) {
                newOrder.push(postId);
            }
        });

        // Find the block instance and update its attributes
        updateBlockAttributes(container, newOrder);
    }

    /**
     * Extract post ID from item element
     */
    function extractPostId(item) {
        // Try various methods to extract post ID
        
        // Method 1: Check data attributes
        if (item.dataset.postId) {
            return parseInt(item.dataset.postId);
        }
        
        // Method 2: Check for ID in class names
        const classes = item.className.split(' ');
        for (let cls of classes) {
            if (cls.startsWith('post-')) {
                const id = cls.replace('post-', '');
                if (!isNaN(id)) {
                    return parseInt(id);
                }
            }
        }

        // Method 3: Look for post ID in child elements
        const postIdElement = item.querySelector('[data-post-id], [data-id]');
        if (postIdElement) {
            return parseInt(postIdElement.dataset.postId || postIdElement.dataset.id);
        }

        // Method 4: Try to find it in the text content (last resort)
        const text = item.textContent;
        const match = text.match(/ID[:\s]+(\d+)/i);
        if (match) {
            return parseInt(match[1]);
        }

        // Method 5: Check button/input values
        const button = item.querySelector('button[value], input[value]');
        if (button && !isNaN(button.value)) {
            return parseInt(button.value);
        }

        return null;
    }

    /**
     * Update block attributes with new order
     */
    function updateBlockAttributes(container, newOrder) {
        // Find the closest block wrapper
        const blockWrapper = container.closest('[data-type*="greenshift"], [class*="greenshift"]');
        if (!blockWrapper) {
            console.warn('Greenshift block wrapper not found');
            return;
        }

        // Get block client ID from the wrapper
        const blockElement = blockWrapper.closest('[data-block]');
        if (!blockElement) {
            console.warn('Block element not found');
            return;
        }

        const clientId = blockElement.getAttribute('data-block');
        if (!clientId) {
            console.warn('Client ID not found');
            return;
        }

        // Use wp.data to update block attributes
        if (window.wp && window.wp.data) {
            const { select, dispatch } = window.wp.data;
            
            // Get current block attributes
            const block = select('core/block-editor').getBlock(clientId);
            if (!block) {
                console.warn('Block not found in store');
                return;
            }

            // Update the post__in attribute (or similar) with new order
            // Greenshift may use different attribute names, so we try multiple possibilities
            const newAttributes = {
                ...block.attributes
            };

            // Common attribute names for manual post selection in query blocks
            const possibleAttributes = ['post__in', 'postIn', 'selectedPosts', 'manualPosts', 'include'];
            
            for (let attr of possibleAttributes) {
                if (newAttributes[attr] !== undefined) {
                    newAttributes[attr] = newOrder;
                    break;
                }
            }

            // If no existing attribute found, create post__in
            if (!possibleAttributes.some(attr => newAttributes[attr] !== undefined)) {
                newAttributes.post__in = newOrder;
            }

            // Dispatch update
            dispatch('core/block-editor').updateBlockAttributes(clientId, newAttributes);
            
            console.log('Updated Greenshift block order:', newOrder);
        }
    }

    /**
     * Initialize when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDragDrop);
    } else {
        initDragDrop();
    }

    // Also initialize after a short delay to catch lazy-loaded elements
    setTimeout(initDragDrop, 1000);
    setTimeout(initDragDrop, 3000);

})();
