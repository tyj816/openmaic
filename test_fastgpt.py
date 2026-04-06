import requests
import json
import uuid
from requests.exceptions import ConnectionError, ConnectTimeout, ReadTimeout, RequestException

# =========================
# 你的 FastGPT 配置
# =========================
BASE_URL = "http://192.168.235.43:3000"
API_URL = f"{BASE_URL}/api/v1/chat/completions"

# 这里填你的“应用特定 key”
API_KEY = "fastgpt-rHK0WSNnmeELFTbWAAKuGHlePp2garqlXwLIrixtkFxhJN9uOvC6m0psjVfi"

# 这里填你想测试的知识库问题
# 建议用你知识库里明确存在答案的问题
TEST_QUESTION = "进程的调度算法有哪些"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "chatId": f"kb-test-{uuid.uuid4().hex[:8]}",
    "stream": False,
    "detail": False,
    "messages": [
        {
            "role": "user",
            "content": TEST_QUESTION
        }
    ]
}


def extract_answer(data):
    if not isinstance(data, dict):
        return None

    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        message = choices[0].get("message", {})
        return message.get("content")

    return None


def extract_reference_info(data):
    """
    FastGPT 不同版本 detail 字段结构可能不同。
    这里只做尽量宽松的提取，方便你看有没有知识库检索痕迹。
    """
    references = []

    if not isinstance(data, dict):
        return references

    # 常见位置尝试
    for key in ["detail", "data"]:
        obj = data.get(key)
        if isinstance(obj, dict):
            for sub_key in ["quoteList", "quotes", "references", "source", "sources"]:
                value = obj.get(sub_key)
                if value:
                    references.append({sub_key: value})

    # 有些版本可能直接挂在顶层
    for sub_key in ["quoteList", "quotes", "references", "source", "sources"]:
        value = data.get(sub_key)
        if value:
            references.append({sub_key: value})

    return references


def check_expected_content(answer: str):
    """
    根据你的知识库内容做一个简单命中判断。
    你后续可以按自己的课程资料替换这里的关键词。
    """
    if not answer:
        return False, []

    expected_keywords = ["时间篇", "先来先服务", "多级轮转"]
    hit = [kw for kw in expected_keywords if kw in answer]
    return len(hit) >= 2, hit


def main():
    print("==== FastGPT 知识库应用测试开始 ====")
    print("请求地址:", API_URL)
    print("测试问题:", TEST_QUESTION)
    print("\n==== 请求体 ====")
    print(json.dumps(payload, ensure_ascii=False, indent=2))

    try:
        response = requests.post(
            API_URL,
            headers=HEADERS,
            json=payload,
            timeout=180
        )

        print("\n==== HTTP 状态码 ====")
        print(response.status_code)

        print("\n==== 原始响应文本 ====")
        print(response.text)

        try:
            data = response.json()
        except Exception:
            print("\n响应不是合法 JSON。")
            return

        print("\n==== JSON 响应 ====")
        print(json.dumps(data, ensure_ascii=False, indent=2))

        answer = extract_answer(data)
        refs = extract_reference_info(data)

        print("\n==== 测试结果 ====")
        if response.status_code != 200:
            print("接口调用失败。")
            print("请重点检查：")
            print("1. API_KEY 是否是“应用专属 key”")
            print("2. FastGPT 服务是否在线")
            print("3. 这台 Windows 是否能访问该 Linux IP 和 3000 端口")
            return

        if not answer:
            print("接口返回 200，但没有拿到标准回答字段 choices[0].message.content")
            print("这通常说明：")
            print("1. 当前 FastGPT 版本返回结构和脚本假设不一致")
            print("2. 应用异常")
            print("3. key 绑定的不是标准对话应用")
            return

        print("接口调用成功。")
        print("\n==== 模型回复 ====")
        print(answer)

        ok, hits = check_expected_content(answer)
        print("\n==== 知识库命中判断 ====")
        if ok:
            print("大概率已成功命中知识库内容。")
            print("命中关键词：", "、".join(hits))
        else:
            print("接口能通，但当前回答不够像命中了你的知识库。")
            print("建议检查：")
            print("1. 应用是否真的绑定了对应知识库")
            print("2. 知识库文件是否状态为“可用”")
            print("3. 检索模式是否开启混合检索 / 重排 / 问题优化")
            print("4. 测试问题是否足够具体")

        print("\n==== 引用/检索痕迹 ====")
        if refs:
            print(json.dumps(refs, ensure_ascii=False, indent=2))
        else:
            print("当前响应里没有明显提取到引用字段。")
            print("这不一定代表没查知识库，可能只是当前版本返回结构不同。")

        print("\n==== 最终结论 ====")
        if ok:
            print("这台 Windows 电脑已经基本验证：FastGPT 知识库应用可用。")
        else:
            print("这台 Windows 电脑已经验证：接口可通，但知识库效果还需要进一步确认。")

    except ConnectTimeout:
        print("\n连接超时：目标机器无法在限定时间内建立连接。")
        print("常见原因：IP/端口不通、防火墙未放行、Docker 端口没映射。")

    except ReadTimeout:
        print("\n读取超时：服务收到了请求，但长时间没有返回。")
        print("常见原因：模型处理慢、后端异常、容器资源不足。")

    except ConnectionError as e:
        print("\n连接失败：")
        print(str(e))
        print("\n重点检查：")
        print("1. 这台 Windows 是否真的能访问 10.15.40.245:3000")
        print("2. Linux 服务器和 Windows 是否在同一局域网，或已打通 VPN/路由")
        print("3. Docker 是否做了 3000:3000 端口映射")
        print("4. Linux 防火墙 / 安全组是否放行 3000")
        print("5. FastGPT 是否正常启动")

    except RequestException as e:
        print("\n请求异常：")
        print(str(e))


if __name__ == "__main__":
    main()
