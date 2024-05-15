# saySth.py

import sys

def say_something(word):
    return f'Python script says: {word}'

if __name__ == "__main__":
    # 解析命令行参数
    args = sys.argv[1:]
    if '-word' in args:
        # 获取 '-word' 参数的索引位置
        index = args.index('-word')
        if index + 1 < len(args):
            # 获取 '-word' 参数后的参数值
            word = args[index + 1]
            print(say_something(word))
        else:
            print('Error: Missing value for -word parameter.')
    else:
        print('Error: Missing -word parameter.')