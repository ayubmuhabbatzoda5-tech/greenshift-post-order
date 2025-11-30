<?php
/**
 * Plugin Name: Greenshift Post Order - Drag & Drop
 * Plugin URI: https://example.com
 * Description: Adds drag-and-drop ordering to Greenshift Query Loop Builder "Post Names" selection list
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: greenshift-post-order
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class Greenshift_Post_Order_DragDrop {
    
    /**
     * Plugin version
     */
    const VERSION = '1.0.0';
    
    /**
     * Constructor
     */
    public function __construct() {
        // Enqueue scripts only in block editor
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_editor_assets'));
    }
    
    /**
     * Enqueue block editor assets
     */
    public function enqueue_editor_assets() {
        // Register and enqueue the drag-drop JavaScript
        wp_enqueue_script(
            'greenshift-post-order-drag-drop',
            plugin_dir_url(__FILE__) . 'js/drag-drop-handler.js',
            array('wp-blocks', 'wp-element', 'wp-data', 'wp-hooks'),
            self::VERSION,
            true
        );
        
        // Add inline styles for drag-drop UI
        wp_add_inline_style('wp-edit-blocks', '
            .gspb-manual-post-item.dragging {
                opacity: 0.5;
                cursor: move;
            }
            .gspb-manual-post-item.drag-over {
                border-top: 2px solid #0073aa;
            }
            .gspb-manual-post-item {
                cursor: move;
                transition: opacity 0.2s;
            }
            .gspb-manual-post-item:hover {
                background-color: #f0f0f0;
            }
        ');
    }
}

// Initialize the plugin
function greenshift_post_order_init() {
    new Greenshift_Post_Order_DragDrop();
}
add_action('plugins_loaded', 'greenshift_post_order_init');
