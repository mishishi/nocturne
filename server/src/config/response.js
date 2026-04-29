/**
 * 统一 API 响应格式工具
 * 解决 API 响应格式不一致的问题
 */

/**
 * 成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 成功消息
 * @returns {object} 统一格式的成功响应
 */
function successResponse(data, message = 'OK') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * 错误响应
 * @param {string} message - 错误消息
 * @param {string} code - 错误代码
 * @param {any} details - 错误详情（可选）
 * @returns {object} 统一格式的错误响应
 */
function errorResponse(message, code = 'ERROR', details = null) {
  const response = {
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  }

  if (details !== null) {
    response.error.details = details
  }

  return response
}

export { successResponse, errorResponse }
