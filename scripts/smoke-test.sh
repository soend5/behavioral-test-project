#!/bin/bash

# Smoke Test 脚本
# 用于快速验证 RBAC/Ownership 校验是否正确工作

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== Smoke Test: RBAC/Ownership 校验 ==="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
PASSED=0
FAILED=0

# 测试函数
test_case() {
    local name=$1
    local url=$2
    local method=$3
    local data=$4
    local expected_code=$5
    local expected_error=$6

    echo -n "测试: $name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    # 检查 HTTP 状态码
    if [ "$http_code" != "$expected_code" ]; then
        echo -e "${RED}失败${NC}"
        echo "  期望 HTTP $expected_code，实际 HTTP $http_code"
        echo "  响应: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi

    # 检查错误码（如果指定）
    if [ -n "$expected_error" ]; then
        if echo "$body" | grep -q "\"code\":\"$expected_error\""; then
            echo -e "${GREEN}通过${NC}"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}失败${NC}"
            echo "  期望错误码 $expected_error，但响应中未找到"
            echo "  响应: $body"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${GREEN}通过${NC}"
        PASSED=$((PASSED + 1))
        return 0
    fi
}

echo "提示: 请先设置以下环境变量（或修改脚本中的值）:"
echo "  - INVALID_TOKEN: 无效的 token"
echo "  - COMPLETED_TOKEN: completed 状态的 invite token"
echo "  - TOKEN1: invite1 的 token"
echo "  - TOKEN2: invite2 的 token"
echo "  - ATTEMPT1_ID: invite1 的 attempt ID"
echo "  - ATTEMPT2_ID: invite2 的 attempt ID"
echo ""

# 测试 1: 无效 token
if [ -n "$INVALID_TOKEN" ]; then
    test_case \
        "无效 token 应返回 INVITE_INVALID" \
        "$BASE_URL/api/public/invite/resolve?token=$INVALID_TOKEN" \
        "GET" \
        "" \
        "400" \
        "INVITE_INVALID"
fi

# 测试 2: Completed invite 不能启动测评
if [ -n "$COMPLETED_TOKEN" ]; then
    test_case \
        "Completed invite 不能启动测评" \
        "$BASE_URL/api/attempt/start" \
        "POST" \
        "{\"token\":\"$COMPLETED_TOKEN\"}" \
        "400" \
        "INVITE_EXPIRED_OR_COMPLETED"
fi

# 测试 3: Token 不能跨 invite 访问 attempt
if [ -n "$TOKEN1" ] && [ -n "$ATTEMPT2_ID" ]; then
    test_case \
        "Token 不能跨 invite 访问 attempt" \
        "$BASE_URL/api/attempt/answer" \
        "POST" \
        "{\"token\":\"$TOKEN1\",\"attemptId\":\"$ATTEMPT2_ID\",\"answers\":[{\"questionId\":\"q1\",\"optionId\":\"o1\"}]}" \
        "403" \
        "FORBIDDEN"
fi

# 测试 4: Completed invite 可以查看结果（应该允许）
if [ -n "$COMPLETED_TOKEN" ]; then
    test_case \
        "Completed invite 可以查看结果" \
        "$BASE_URL/api/public/attempt/result?token=$COMPLETED_TOKEN" \
        "GET" \
        "" \
        "200" \
        ""
fi

echo ""
echo "=== 测试结果 ==="
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo "总计: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}部分测试失败，请检查上述输出${NC}"
    exit 1
fi

