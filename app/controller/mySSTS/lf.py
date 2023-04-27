# -*- coding: utf-8 -*-
import argparse
import json
import pandas as pd
import requests
import time
import sys
import io
import re
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from tabulate import tabulate, tabulate_formats

# 改变标准输出的默认编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer,encoding='utf8')
# 设置请求头
headers = {'User-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.57'}
cookies = ''
today = datetime.today()
yesterday = today - timedelta(days=1)

today_str = today.strftime('%Y-%m-%d')
yesterday_str = yesterday.strftime('%Y-%m-%d')

def login_in(user, password):
    # 登录页面URL
    login_url = 'http://my.ssts.cn/userPasswordValidate.portal'

    # 登录表单数据
    login_data = {
        'Login.Token1': user,
        'Login.Token2': password,
        'goto': 'http://my.ssts.cn/loginSuccess.portal',
        'gotoOnFail': 'http://my.ssts.cn/loginFailure.porta'
    }
    
    # 创建会话对象
    session = requests.Session()
    # 发送POST请求进行登录
    response = session.post(login_url, data=login_data, headers=headers)

    # 获取登录后的页面地址和cookie
    if response.status_code == 200:
        # print('登录成功！')
        # print('页面地址:', response.url)
        # print('cookies:', session.cookies.get_dict())
        try:
            # 登录后才能访问的网页
            # 实际上，此处可直接访问教学计划总表 url，但为了扩展性保留访问 index 的代码
            url = 'http://my.ssts.cn/index.portal'
            response = session.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            # 能正常获取姓名，代表登录成功
            text = soup.find(id="welcomeMsg").text.strip()
        except:
            print('登录失败！')
            sys.exit()
        else:
            cookies = session.cookies.get_dict()
            # print('\n')
            print(text, '。\033[33m 向雷锋同志学习！ \033[0m\n使用前请\033[41m 仔细核对 \033[0m下表中的课程信息是否正确，若有误请按 CTRL + C 退出程序：')

    return session

# 查询教学计划总表
def query_all_plan(session):
    # 授课计划录入（新）
    # url = 'http://my.ssts.cn/detachPage.portal?.pn=p6884_p115256'
    url = 'http://my.ssts.cn/pnull.portal?.pen=f1987&.f=f1987&.pmn=view&action=getkfrq'
    response = session.post(url, cookies=cookies, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    return format_all_plan_table(soup)


def format_all_plan_table(soup):
    # 查找所有“查看”超链接
    links = soup.find_all('a', string='查看')
    # print(links)

    # 查找所有“教学班编号”
    hidden_inputs = soup.find_all('input', {'type': 'hidden', 'class': 'mytip'})
    jxb_values = [input_tag['value'] for input_tag in hidden_inputs]
    # print(jxb_values)

    # 查找所有的上课节数记录
    soup_str = str(soup)
    pattern = re.compile(r'^.*sksjmsMap\[\".*$', re.MULTILINE)
    result = pattern.findall(soup_str)

    # 从字符串中获取上课节数记录
    class_time_list = []
    for item in result:
      pattern = r'\[.+?\]星期(?P<weekday>\S+?)\((?P<class_time>\S+?)\)'
      matches = re.findall(pattern, item)
      class_time = [(match[0], match[1].replace('第','').replace('节','')) for match in matches]
      class_time_list.append(class_time)


    # 从字符串中获取上课地点信息
    class_locate = []
    for item in result:
        # 使用正则表达式提取数字和房间信息
        match = re.search(r'\)([^,]*)[,"]', item)
        if match:
            class_locate.append(match.group(1).strip())

    # 查找教学计划总表数据
    table = soup.find(id="queryGridf1987")
    # 先获取所有的 tr 数据
    tr = table.find_all('tr')
    # 获取首行 tr 里的 th数据
    th = tr[0].find_all('th')
    # 创建一个 list，用于保存
    info_list = []

    for tr_num in range(1,len(tr)):
        # 依次获取其他 tr 里的 td 数据
        td = tr[tr_num].find_all('td')
        # 创建一个 json,用户保存单行数据
        info_dict = {}
        info_dict[th[0].text] = td[0].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()
        # 合班情况
        info_dict['授课班级'] = td[8].text.replace("\n", "").replace("\r", "").replace("\t", "").replace("...", "").strip()
        # 教学班编号
        info_dict['教学班编号'] = jxb_values[tr_num - 1]
        # 上课教室
        info_dict['上课教室'] = class_locate[tr_num -1]
        # 周学时
        info_dict[th[7].text] = int(float(td[7].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()))
        info_dict['上课时间'] = class_time_list[tr_num - 1]
        info_dict['url'] = links[tr_num - 1]['href']
        info_list.append(info_dict)
      
    return info_list

# 教学日志填写总表
def query_all_log(session):
    # 教学日志填写按钮
    url = 'http://my.ssts.cn/detachPage.portal?.pn=p6884_p237'
    response = session.post(url, cookies=cookies, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    return format_all_log_table(soup)

def format_all_log_table(soup):
    # 查找所有“填写日志”超链接
    # 不需要这个字段
    # links = soup.find_all('a', string='填写日志')
    # print(links)

    # 查找教学日志填写总表数据
    table = soup.find(id="queryGridf2387")
    # 先获取所有的 tr 数据
    tr = table.find_all('tr')
    # 获取首行 tr 里的 th数据
    th = tr[0].find_all('th')
    # 创建一个 list，用于保存
    info_list = []

    for tr_num in range(1,len(tr)):
        # 依次获取其他 tr 里的 td 数据
        td = tr[tr_num].find_all('td')
        # 创建一个 json,用户保存单行数据
        info_dict = {}
        # 课程
        info_dict[th[0].text] = td[0].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()
        # 合班情况
        info_dict['授课班级'] = td[2].text.replace("\n", "").replace("\r", "").replace("\t", "").replace("...", "").strip()
        # 上课班级
        info_dict[th[7].text] = int(float(td[7].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()))
        # info_dict['fill_url'] = links[tr_num - 1]['href']
        info_list.append(info_dict)
      
    return info_list

# 查询并格式化当前日期之前，所有需要填写的教学日志
def query_single_plan(session, plan):
    url_prefix = 'http://my.ssts.cn/detachPage.portal'
    url = url_prefix + plan['url']
    response = session.get(url, cookies=cookies, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    # 获取单科的教学计划录入页（完整的日志信息）
    table = soup.find(id="queryGridf1987")
    # 先获取所有的 tr 数据
    tr = table.find_all('tr')

    # 获取首行 tr 里的 th数据
    th = tr[0].find_all('th')

    # 创建一个 list，用于保存
    single_course_list = []

    for tr_num in range(1,len(tr)):
      # 依次获取其他 tr 里的 td 数据
      td = tr[tr_num].find_all('td')
      # 授课时间
      class_date_str = td[4].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()
      class_date = datetime.strptime(class_date_str, '%Y-%m-%d')
      # 比较日期对象，如果时间未到，不统计（不需要填写）
      if class_date >= yesterday:
        # print(f'{class_date_str} 大于今天')
        break

      # 创建一个 json,用户保存单行数据
      info_dict = {}
      info_dict[th[1].text] = td[1].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()
      info_dict[th[0].text] = td[0].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()
      info_dict[th[4].text] = class_date_str
      info_dict[th[6].text] = td[6].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()
      # 课时
      info_dict[th[7].text] = int(float(td[7].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()))
      info_dict[th[8].text] = td[8].text.replace("\n", "").replace("\r", "").replace("\t", "").strip()
      single_course_list.append(info_dict)

    return single_course_list
    # 结果示例
    # [{'序号': '1', '周次': '2', '理论授课时间': '2023-02-16', '授课章节与内容': '信息检索课程概述', '课时': 2, '课外作业': '完成课程作业'},
    #  {'序号': '2', '周次': '2', '理论授课时间': '2023-02-17', '授课章节与内容': '网络笔记的使用与共享', '课时': 2, '课外作业': '完成课程作业'}]

# 美化并输出教学计划表格，用于核对信息是否正确
def show_plan_table(plan_table, log_table):
    df_plan_table = pd.DataFrame(plan_table)
    df_plan_table = df_plan_table.drop(['url', '教学班编号'], axis=1)
    col_aligns = ["left", "left", "left", "left", "center"]

    print(tabulate(df_plan_table, headers='keys', tablefmt='simple', colalign=col_aligns))

    for num in range(0, len(plan_table)):
        if plan_table[num]['课程'] == log_table[num]['课程'] and plan_table[num]['授课班级'] == log_table[num]['授课班级']:
            plan_table[num]['已填日志'] = log_table[num]['日志数']
            # plan_table[num]['fill_url'] = log_table[num]['fill_url']
        else:
            print('日志表与计划表不匹配！')
            sys.exit()

# 美化并输出教学计划已填未填对比表格
def show_log_info(plan_table):
    df_plan_table = pd.DataFrame(plan_table)
    df_plan_table = df_plan_table.drop(['url', '上课时间', '周学时', '上课教室', 'log_list'], axis=1)
    # df_plan_table = df_plan_table.drop('fill_url', axis=1)
    # df_plan_table = df_plan_table.drop('教学班编号', axis=1)
    col_aligns = ["left"] * 6
    print(tabulate(df_plan_table, headers='keys', tablefmt='simple', colalign=col_aligns))

# 美化并输出已经造好的课程提交数据
def show_course_data(course_data_table, course_info):
    df_course_table = pd.DataFrame(course_data_table)
    col_aligns = ["left"] * 8
    print('\n\033[33m正在预生成',course_info,'课程日志：\033[0m\n')
    print(tabulate(df_course_table, headers='keys', tablefmt='simple', colalign=col_aligns, showindex=False))

# 计算缺失的日志数量，并重新组织 plan_table 的结构，方便后续填表
def show_missing_log_num(session, plan_table):
    miss_log_num = 0
    for plan in plan_table:
      single_course_list = query_single_plan(session, plan)
      plan['log_list'] = single_course_list
      plan['须填日志'] = len(single_course_list)
      miss_log_num = miss_log_num + plan['须填日志'] - plan['已填日志']
    print('\n\n截止前一天',yesterday_str,'\033[41m 缺少日志',0 if miss_log_num < 0 else miss_log_num,'份 \033[0m，具体情况如下：\n')

    return plan_table

# 根据字符串查找上课教室编号
def query_jsdm_code(session, js_str):
    query_url = 'http://my.ssts.cn/pnull.portal?.pen=jxrz.jxrztx&.pmn=view&action=optionsRetrieve&className=com.wisedu.app.w3.jcsjzx.domain.Js&namedQueryId=&displayFormat=[{jsdm}]{jsmc}&useBaseFilter=true'

    query_data = {
        'start': 0,
        'limit': 10,
        'query': js_str,
        'fullEntity': False,
        'selectedItems': ''
    }

    response = session.post(query_url, data=query_data, headers=headers)
    code = re.search(r'"code":"(\d+)"', response.text).group(1)
    return code

# 根据理论授课时间得周几数据，再根据 plan 中的上课时间，数据获得对应的上课节次
def get_time_tuple_by_class_time(class_time, date_str):
    weekday_dict = {'一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6}
    date = datetime.strptime(date_str, '%Y-%m-%d')
    weekday = date.weekday()
    weekday_str = list(weekday_dict.keys())[list(weekday_dict.values()).index(weekday)]
    for item in class_time:
        if item[0] == weekday_str:
            return [weekday, chinese_to_arabic_list(item[1])]
    return []

# 将中文数字转化为阿拉伯数字，并返回数值数组，如[1,2,3]
def chinese_to_arabic_list(chinese_str):
    chinese_num = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}
    num_list = []
    for c in chinese_str.split(','):
        if c in chinese_num:
            num_list.append(chinese_num[c])
        else:
            return None
    return num_list

def get_js_timestamp():
    timestamp = int(time.time() * 1000)
    return timestamp

# 模仿校园网提交前的同名 JS 操作，防止重复提交
def checkRz(session,check_data):
    check_url = 'http://my.ssts.cn/pnull.portal?action=rqvalidate&.pen=jxrz.jxrztx&.pmn=view'

    full_check_data = {
        'id': '',
        'rq': check_data['rq'],
        'ksjc': check_data['ksjc'],
        'jsjc': check_data['jsjc'],
        'jxbid': check_data['jxbbh']
    }

    response = session.post(check_url, params=full_check_data, headers=headers)
    success = response.text[11]
    try:
        success = int(success)
    except:
        print('数字化校园服务器异常回复，请稍后重试。')
        sys.exit()
    # success 为 0，代表可以提交
    return success


def confirm_post(session, course_data, check_data):
    save_url = 'http://my.ssts.cn/detachPage.portal?.p=dHxjb20ud2lzY29tLnBvcnRhbC5zaXRlLnYyLmltcGwuRnJhZ21lbnRXaW5kb3d8ZjIzODd8dmlld3xub3JtYWx8YWN0aW9uPXJ6ZWRpdA__'

    print('\n\033[33m上表显示即将正式填写的课程，你是否想继续？')
    while True:
        user_input = input('\033[33m请在核对信息后输入 Y 继续，输入 A 放弃并继续显示下一条，输入 Q 退出程序：\033[0m')
        if user_input.lower() == 'y':
            # 继续执行
            print('日志信息确认完毕，自动保存至数字化校园中...')
            # 向服务器确认没有日志冲突, 0 代表没有冲突，1 代笔有冲突
            chk_result = checkRz(session,check_data)
            # print(chk_result)
            if  chk_result == 0:
                session.post(save_url, data=course_data, headers=headers)
            else:
                print('\033[33m校园网服务器中已有同一日期相同节次的课程日志，自动跳过添加。\033[0m')
            # 无论是否添加，都结束本轮问询
            break
        elif user_input.lower() == 'a':
            print('用户放弃这条日志的填写。')
            break
        elif user_input.lower() == 'q':
            # 结束程序
            print('用户主动结束程序，再见。')
            sys.exit()
        else:
            print("\033[33m无效输入，")


def post_log(session, plan_table):
    # {'课程': '信息检索', '授课班级': '信息2201班', '教学班编号': '30724', '上课教室': '5102锐捷网络实训室', '周学时': 4, '上课时间': [('四', '一,二'), ('五', '一,二')], '已填日志': 5, 'log_list': [{'序号': '1', '周次': '2', '理论授课时间': '2023-02-16', '授课章节与内容': '信息检索课程概述', '课时': 2, ' 课外作业': '完成课程作业'}, {'序号': '2', '周次': '2', '理论授课时间': '2023-02-17', '授课章节与内容': '网络笔记的使用与共享', '课时': 2, '课外作业': '完成课程作业'}, {'序号': '3', '周次': '3', '理论授课时间': '2023-02-23', '授课章节与内容': '浏览器比较与选择', '课时': 2, '课外作业': '完成课程作业'}, {'序号': '4', '周次': '3', '理论授课时间': '2023-02-24', '授课章节与内容': '浏览器的进阶使用', '课时': 2, '课外作业': '完成课程作业'}, {'序号': '5', '周次': '4', '理论授课时间': '2023-03-02', '授课章节与内容': '实践1：浏览器使用实践', '课时': 2, '课外作业': '完成课程作业'}], '须填日志': 5}

    for plan in plan_table:
        miss_log_num = plan['须填日志'] - plan['已填日志']
        if miss_log_num > 0:
            for i in range(plan['须填日志'] - miss_log_num, plan['须填日志']):
                course_data = {}
                course_data['jxbbh'] = plan['教学班编号']
                course = plan['log_list'][i]
                course_data['rq'] = course['理论授课时间']
                # 周次 0，1，2，3，4
                course_data['zc2'] = int(course['周次']) - 1
                time_list = get_time_tuple_by_class_time(plan['上课时间'], course['理论授课时间'])
                # print(time_list) [1, [5, 6]]  ---> [周二，[第五节， 第六节]]
                # 此处有 周次 和 首节课就足够了，末节课可以通过课时 -1 算出来
                course_data['xq'] = time_list[0]
                course_data['ksjc'] = time_list[1][0]
                course_data['jsjc'] = time_list[1][0] + course['课时'] - 1
                course_data['jsdm'] = query_jsdm_code(session, plan['上课教室'])
                course_data['kss'] = course['课时']
                course_data['tkls'] = ''
                course_data['rznr1'] = course['授课章节与内容']
                course_data['rznr2'] = course['课外作业']
                course_data['rznr3'] = '优'
                course_data['qqlx'] = 1
                course_data['qqlxhidden'] = 1
                course_data['qqjc'] = ''
                course_data['operate'] = 'save'
                course_data['rzlx'] = 'llrz'
                course_data['jxrzxxid'] = ''
                course_data['qqmdVals'] = ''

                course_data_table = {}
                course_data_table['周次'] = '第' + str(course_data['zc2'] + 1) + '周'
                course_data_table['日期'] = course_data['rq']
                course_data_table['星期'] = '星期' + str(course_data['xq'] + 1)
                course_data_table['节次'] = str(course_data['ksjc']) + ' - ' + str(course_data['jsjc'])
                course_data_table['课时数'] = course_data['kss']
                course_data_table['课程内容'] = course_data['rznr1']
                course_data_table['作业布置情况'] = course_data['rznr2']
                course_data_table['课堂情况记录'] = course_data['rznr3']

                check_data = {}
                check_data['rq'] = course_data['rq']
                check_data['ksjc'] = course_data['ksjc']
                check_data['jsjc'] = course_data['jsjc']
                check_data['jxbbh'] = course_data['jxbbh']

                course_info = plan['授课班级'] + ' ' + plan['课程']
                # 注意为使用表格美化库，course_data_table 实际提交时是个数组而不是对象
                show_course_data([course_data_table], course_info)
                # 正式向数据库提交教学日志
                confirm_post(session, course_data, check_data)
    
    print('\n自动化部分流程结束。请登录数字化校园\033[41m 核对数据，并添加出勤记录 \033[0m。 Bye.')
                # course_data = {
                #     'jxbbh': '31002',
                #     'rq': '2023-02-27',
                #     'zc2': 3,
                #     'xq': 0,
                #     'ksjc': 5,
                #     'jsjc': 6,
                #     'jsdm': '5102',
                #     'kss': 2,
                #     'tkls': '',
                #     'rznr1': '浏览器的进阶使用',
                #     'rznr2': '完成课程作业',
                #     'rznr3': '优',
                #     'qqlx': 1,
                #     'qqlxhidden': 1,
                #     'qqjc': '',
                #     'operate': 'save',
                #     'rzlx': 'llrz',
                #     'jxrzxxid': '',
                #     'qqmdVals': ''
                # }

def main():
    # 获取 session
    session = login_in(user, password)
    # 获取教学计划总表
    plan_table = query_all_plan(session)
    # 获取教学日志总表
    log_table = query_all_log(session)
    # 美化并输出教学计划表格，用于核对信息是否正确
    show_plan_table(plan_table, log_table)
    # 计算缺失的日志数量，并重新组织 plan_table 的结构，方便后续填表
    plan_table = show_missing_log_num(session, plan_table)
    # 显示截止前一天的教学日志填写情况
    show_log_info(plan_table)
    # 开始自动化填写流程
    post_log(session, plan_table)


if __name__ == '__main__':
    # 创建 ArgumentParser 对象
    parser = argparse.ArgumentParser(description='程序说明')

    # 添加命令行参数
    parser.add_argument('-u', '--username', help='用户名')
    parser.add_argument('-p', '--password', help='密码')

    # 解析命令行参数
    args = parser.parse_args()

    # 检查参数是否存在
    if not args.username:
        print('请输入用户名')
    elif not args.password:
        print('请输入密码')
    else:
        # 使用参数
        user = args.username
        password = args.password
        main()