import { Avatar, AvatarProps } from '@mantine/core';

interface GithubAvatarProps extends AvatarProps {
    login: string;
    urlRepo?: string;
}

export default function GithubAvatar(props: GithubAvatarProps) {
    const { login, urlRepo, ...others } = props;

    const url = urlRepo
        ? `https://github.com/railmapgen/${urlRepo}/issues?q=is:issue+author:${login}`
        : `https://github.com/${login}`;

    return (
        <Avatar
            component="a"
            name={login}
            title={login}
            src={`https://github.com/${login}.png`}
            alt={login}
            href={url}
            target="_blank"
            color="initials"
            {...others}
        />
    );
}
