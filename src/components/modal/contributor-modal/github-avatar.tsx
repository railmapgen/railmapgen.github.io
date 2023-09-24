import { Avatar, AvatarProps } from '@chakra-ui/react';

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
            name={login}
            title={login}
            src={`https://github.com/${login}.png`}
            loading="lazy"
            onClick={() => window.open(url, '_blank')}
            cursor="pointer"
            {...others}
        />
    );
}
