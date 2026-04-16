<?php
/**
 * Redis Helper Functions
 * This file contains helper functions for Redis caching operations
 */

// Initialize Redis connection with error handling
function getRedisConnection() {
    global $redis_host, $redis_port, $redis_password;
    
    if (!extension_loaded('redis')) {
        return false;
    }
    
    $redis = new Redis();
    try {
        $redis->connect($redis_host, $redis_port, 2.5); // 2.5 second timeout
        if (!empty($redis_password)) {
            $redis->auth($redis_password);
        }
        return $redis;
    } catch (Exception $e) {
        error_log("Redis connection error: " . $e->getMessage());
        return false;
    }
}

/**
 * Generate a cache key for product queries
 * @param array $params Query parameters
 * @return string Cache key
 */
function generateProductCacheKey($params) {
    // Sort parameters to ensure consistent cache keys
    if (is_array($params)) {
        ksort($params);
    }
    
    // Generate a unique hash based on the parameters
    return 'products:query:' . md5(json_encode($params));
}

/**
 * Store data in Redis cache with error handling
 * @param string $key Cache key
 * @param mixed $data Data to store
 * @param int $ttl Time to live in seconds (default: 300 seconds/5 minutes)
 * @return bool Success or failure
 */
function storeInCache($key, $data, $ttl = 300) {
    $redis = getRedisConnection();
    if ($redis === false) {
        return false;
    }
    
    try {
        $serialized = serialize($data);
        return $redis->setex($key, $ttl, $serialized);
    } catch (Exception $e) {
        error_log("Redis set error: " . $e->getMessage());
        return false;
    }
}

/**
 * Retrieve data from Redis cache with error handling
 * @param string $key Cache key
 * @return mixed Data or false if not found
 */
function getFromCache($key) {
    $redis = getRedisConnection();
    if ($redis === false) {
        return false;
    }
    
    try {
        $data = $redis->get($key);
        if ($data === false) {
            return false;
        }
        return unserialize($data);
    } catch (Exception $e) {
        error_log("Redis get error: " . $e->getMessage());
        return false;
    }
}

/**
 * Remove data from Redis cache
 * @param string $key Cache key
 * @return bool Success or failure
 */
function removeFromCache($key) {
    $redis = getRedisConnection();
    if ($redis === false) {
        return false;
    }
    
    try {
        return $redis->del($key);
    } catch (Exception $e) {
        error_log("Redis delete error: " . $e->getMessage());
        return false;
    }
}

/**
 * Clear product cache when data is updated
 */
function clearProductCache() {
    $redis = getRedisConnection();
    if ($redis === false) {
        return false;
    }
    
    try {
        // Get all product cache keys
        $keys = $redis->keys('products:*');
        
        // Delete all product cache keys
        if (!empty($keys)) {
            return $redis->del($keys);
        }
        return true;
    } catch (Exception $e) {
        error_log("Redis clear cache error: " . $e->getMessage());
        return false;
    }
}