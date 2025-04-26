<?php
/**
 * Watertown Community Gardens - Child Theme Functions
 */

// Proper way to enqueue parent and child theme styles
function wcg_theme_enqueue_styles() {
    // First, enqueue the parent theme stylesheet
    wp_enqueue_style( 'parent-style', 
        get_template_directory_uri() . '/style.css' 
    );
    
    // Then, enqueue the child theme stylesheet
    wp_enqueue_style( 'child-style',
        get_stylesheet_directory_uri() . '/style.css',
        array( 'parent-style' ),  // This makes it load AFTER the parent theme stylesheet
        wp_get_theme()->get('Version') // This version number will update when you update your theme
    );
}
add_action( 'wp_enqueue_scripts', 'wcg_theme_enqueue_styles' );

// If you have any SCSS compiled CSS files, enqueue them here
function wcg_theme_enqueue_compiled_styles() {
    // Enqueue your compiled CSS file
    wp_enqueue_style( 'wcg-compiled-styles', 
        get_stylesheet_directory_uri() . '/style.min.css', 
        array( 'child-style' ),  // This makes it load AFTER the child theme's main stylesheet
        wp_get_theme()->get('Version')
    );
}
add_action( 'wp_enqueue_scripts', 'wcg_theme_enqueue_compiled_styles' );